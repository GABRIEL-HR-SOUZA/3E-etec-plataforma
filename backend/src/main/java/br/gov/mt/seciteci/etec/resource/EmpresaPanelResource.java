package br.gov.mt.seciteci.etec.resource;

import br.gov.mt.seciteci.etec.config.DatabaseManager;
import br.gov.mt.seciteci.etec.service.AuthService;
import br.gov.mt.seciteci.etec.service.VagaValidator;
import io.quarkus.elytron.security.common.BcryptUtil;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Path("/api/empresa")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class EmpresaPanelResource {

    @Inject
    DatabaseManager db;

    @Inject
    AuthService authService;

    @Inject
    VagaValidator vagaValidator;

    private static final DateTimeFormatter DT_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private AuthService.UserSession exigirEmpresa(String authHeader) {
        AuthService.UserSession s = authService.validarTokenHeader(authHeader);
        if (s == null || s.empresaId() == null || !"EMPRESA".equals(s.perfil())) {
            return null;
        }
        return s;
    }

    @GET
    @Path("/dashboard")
    public Response getDashboard(@HeaderParam("Authorization") String authHeader) {
        AuthService.UserSession s = exigirEmpresa(authHeader);
        if (s == null) return Response.status(Response.Status.FORBIDDEN).entity(Map.of("mensagem", "Acesso restrito a empresas cadastradas.")).build();

        try (Connection conn = db.getConnection()) {
            Map<String, Object> empresa = carregarEmpresa(conn, s.empresaId());
            List<Map<String, Object>> vagas = listarVagasDaEmpresa(conn, s.empresaId());
            List<Map<String, Object>> usuarios = listarUsuariosDaEmpresa(conn, s.empresaId());
            List<Map<String, Object>> notificacoes = listarNotificacoes(conn, s.usuarioId());

            int totalCandidatos = 0;
            int totalContratados = 0;
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT COUNT(*) as tot, COALESCE(SUM(c.contratado), 0) as cont FROM candidatura c JOIN vaga v ON v.id = c.vaga_id WHERE v.empresa_id = ?")) {
                ps.setInt(1, s.empresaId());
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        totalCandidatos = rs.getInt("tot");
                        totalContratados = rs.getInt("cont");
                    }
                }
            }

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("empresa", empresa);
            resp.put("vagas", vagas);
            resp.put("usuarios", usuarios);
            resp.put("notificacoes", notificacoes);
            resp.put("totalCandidatos", totalCandidatos);
            resp.put("totalContratados", totalContratados);
            return Response.ok(resp).build();
        } catch (Exception e) {
            return Response.serverError().entity(Map.of("mensagem", e.getMessage())).build();
        }
    }

    @POST
    @Path("/vagas")
    @SuppressWarnings("unchecked")
    public Response criarVaga(@HeaderParam("Authorization") String authHeader, Map<String, Object> body) {
        AuthService.UserSession s = exigirEmpresa(authHeader);
        if (s == null) return Response.status(Response.Status.FORBIDDEN).build();

        boolean salvarRascunho = Boolean.TRUE.equals(body.get("rascunho"));
        VagaValidator.ValidacaoResultado val = vagaValidator.validarVaga(body);
        String agora = LocalDateTime.now().format(DT_FMT);

        try (Connection conn = db.getConnection()) {
            // Verifica se a empresa está bloqueada
            Map<String, Object> emp = carregarEmpresa(conn, s.empresaId());
            if ("bloqueada".equals(emp.get("status"))) {
                return Response.status(Response.Status.FORBIDDEN)
                        .entity(Map.of("sucesso", false, "mensagem", "Sua empresa está bloqueada pela Coordenação da ETEC e não pode publicar vagas.")).build();
            }

            // Regra #3: Cobrança proibida -> recusa a vaga e bloqueia a empresa na hora!
            if (val.cobrancaDetectada()) {
                try (PreparedStatement psBlk = conn.prepareStatement("UPDATE empresa SET status = 'bloqueada', motivo_recusa = 'Bloqueio automático (Regra #3): Tentativa de cobrança de valor/taxa/kit de candidato.' WHERE id = ?")) {
                    psBlk.setInt(1, s.empresaId());
                    psBlk.executeUpdate();
                }
                try (PreparedStatement psOff = conn.prepareStatement("UPDATE vaga SET status = 'encerrada' WHERE empresa_id = ?")) {
                    psOff.setInt(1, s.empresaId());
                    psOff.executeUpdate();
                }
                authService.registrarLog(conn, s.usuarioId(), s.nome(), s.perfil(), "BLOQUEIO_AUTOMATICO_COBRANCA_CANDIDATO",
                        "Empresa #" + s.empresaId() + " bloqueada por tentativa de cobrança em vaga", "127.0.0.1");
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity(Map.of("sucesso", false, "erros", val.erros(), "mensagem", String.join(" ", val.erros()))).build();
            }

            if (!val.valido()) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity(Map.of("sucesso", false, "erros", val.erros(), "mensagem", String.join(" ", val.erros()))).build();
            }

            String statusInicial = salvarRascunho ? "rascunho" : "aguardando_aprovacao";

            conn.setAutoCommit(false);
            try {
                int vagaId;
                try (PreparedStatement ps = conn.prepareStatement(
                        "INSERT INTO vaga (empresa_id, tipo, titulo, atividades, requisitos, bolsa, beneficios, carga_horaria, horas_dia, horas_semana, turno, modalidade, local, cidade, qtd_vagas, prazo, forma_candidatura, contato_externo, status, confidencial, destaque, criado_em) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)",
                        Statement.RETURN_GENERATED_KEYS)) {
                    ps.setInt(1, s.empresaId());
                    ps.setString(2, str(body.get("tipo")));
                    ps.setString(3, str(body.get("titulo")));
                    ps.setString(4, str(body.get("atividades")));
                    ps.setString(5, str(body.get("requisitos")));
                    ps.setString(6, str(body.get("bolsa")));
                    ps.setString(7, str(body.get("beneficios")));
                    ps.setString(8, str(body.get("carga_horaria")));
                    ps.setInt(9, intVal(body.get("horas_dia"), 6));
                    ps.setInt(10, intVal(body.get("horas_semana"), 30));
                    ps.setString(11, str(body.get("turno")));
                    ps.setString(12, str(body.get("modalidade")));
                    ps.setString(13, str(body.get("local")));
                    ps.setString(14, str(body.get("cidade")).isBlank() ? "Cuiabá/MT" : str(body.get("cidade")));
                    ps.setInt(15, intVal(body.get("qtd_vagas"), 1));
                    ps.setString(16, str(body.get("prazo")));
                    ps.setString(17, str(body.get("forma_candidatura")));
                    ps.setString(18, str(body.get("contato_externo")));
                    ps.setString(19, statusInicial);
                    ps.setInt(20, Boolean.TRUE.equals(body.get("confidencial")) ? 1 : 0);
                    ps.setString(21, agora);
                    ps.executeUpdate();
                    try (ResultSet keys = ps.getGeneratedKeys()) {
                        keys.next();
                        vagaId = keys.getInt(1);
                    }
                }

                salvarCursosDaVaga(conn, vagaId, (List<Map<String, Object>>) body.get("cursos"), intVal(body.get("modulo_minimo"), 1));

                if (!salvarRascunho) {
                    try (PreparedStatement psN = conn.prepareStatement(
                            "INSERT INTO notificacao (usuario_id, canal, titulo, mensagem, lida, data) VALUES (1, 'SISTEMA_EMAIL', ?, ?, 0, ?)")) {
                        psN.setString(1, "Nova vaga aguardando aprovação: " + str(body.get("titulo")));
                        psN.setString(2, "Enviada pela empresa " + emp.get("nomeFantasia") + ". Verifique a Fila de Aprovação.");
                        psN.setString(3, agora);
                        psN.executeUpdate();
                    }
                }

                authService.registrarLog(conn, s.usuarioId(), s.nome(), s.perfil(), "CADASTRO_VAGA_EMPRESA",
                        "Vaga #" + vagaId + " (" + str(body.get("titulo")) + ") salva com status: " + statusInicial, "127.0.0.1");

                conn.commit();
                return Response.ok(Map.of(
                        "sucesso", true,
                        "vagaId", vagaId,
                        "status", statusInicial,
                        "mensagem", salvarRascunho
                                ? "Vaga salva como rascunho."
                                : "Vaga enviada para a Fila de Aprovação da Coordenação de Estágio da ETEC Cuiabá!"
                )).build();
            } catch (Exception ex) {
                conn.rollback();
                throw ex;
            } finally {
                conn.setAutoCommit(true);
            }
        } catch (Exception e) {
            return Response.serverError().entity(Map.of("sucesso", false, "mensagem", e.getMessage())).build();
        }
    }

    @PUT
    @Path("/vagas/{id}")
    @SuppressWarnings("unchecked")
    public Response editarVaga(@HeaderParam("Authorization") String authHeader, @PathParam("id") int vagaId, Map<String, Object> body) {
        AuthService.UserSession s = exigirEmpresa(authHeader);
        if (s == null) return Response.status(Response.Status.FORBIDDEN).build();

        VagaValidator.ValidacaoResultado val = vagaValidator.validarVaga(body);
        if (!val.valido()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("sucesso", false, "erros", val.erros(), "mensagem", String.join(" ", val.erros()))).build();
        }

        boolean salvarRascunho = Boolean.TRUE.equals(body.get("rascunho"));
        // Regra de Negócio #1: "Edição de vaga publicada volta para aprovação"
        String novoStatus = salvarRascunho ? "rascunho" : "aguardando_aprovacao";

        try (Connection conn = db.getConnection()) {
            conn.setAutoCommit(false);
            try {
                try (PreparedStatement ps = conn.prepareStatement(
                        "UPDATE vaga SET tipo = ?, titulo = ?, atividades = ?, requisitos = ?, bolsa = ?, beneficios = ?, " +
                        "carga_horaria = ?, horas_dia = ?, horas_semana = ?, turno = ?, modalidade = ?, local = ?, cidade = ?, " +
                        "qtd_vagas = ?, prazo = ?, forma_candidatura = ?, contato_externo = ?, status = ?, motivo_ajuste = NULL, confidencial = ? " +
                        "WHERE id = ? AND empresa_id = ?")) {
                    ps.setString(1, str(body.get("tipo")));
                    ps.setString(2, str(body.get("titulo")));
                    ps.setString(3, str(body.get("atividades")));
                    ps.setString(4, str(body.get("requisitos")));
                    ps.setString(5, str(body.get("bolsa")));
                    ps.setString(6, str(body.get("beneficios")));
                    ps.setString(7, str(body.get("carga_horaria")));
                    ps.setInt(8, intVal(body.get("horas_dia"), 6));
                    ps.setInt(9, intVal(body.get("horas_semana"), 30));
                    ps.setString(10, str(body.get("turno")));
                    ps.setString(11, str(body.get("modalidade")));
                    ps.setString(12, str(body.get("local")));
                    ps.setString(13, str(body.get("cidade")).isBlank() ? "Cuiabá/MT" : str(body.get("cidade")));
                    ps.setInt(14, intVal(body.get("qtd_vagas"), 1));
                    ps.setString(15, str(body.get("prazo")));
                    ps.setString(16, str(body.get("forma_candidatura")));
                    ps.setString(17, str(body.get("contato_externo")));
                    ps.setString(18, novoStatus);
                    ps.setInt(19, Boolean.TRUE.equals(body.get("confidencial")) ? 1 : 0);
                    ps.setInt(20, vagaId);
                    ps.setInt(21, s.empresaId());
                    if (ps.executeUpdate() == 0) {
                        conn.rollback();
                        return Response.status(Response.Status.FORBIDDEN)
                                .entity(Map.of("sucesso", false, "mensagem", "Vaga não pertence a esta empresa.")).build();
                    }
                }

                try (PreparedStatement psDel = conn.prepareStatement("DELETE FROM vaga_curso WHERE vaga_id = ?")) {
                    psDel.setInt(1, vagaId);
                    psDel.executeUpdate();
                }
                salvarCursosDaVaga(conn, vagaId, (List<Map<String, Object>>) body.get("cursos"), intVal(body.get("modulo_minimo"), 1));

                authService.registrarLog(conn, s.usuarioId(), s.nome(), s.perfil(), "EDICAO_VAGA_RETORNO_FILA",
                        "Vaga #" + vagaId + " editada e encaminhada para " + novoStatus, "127.0.0.1");
                conn.commit();
                return Response.ok(Map.of(
                        "sucesso", true,
                        "status", novoStatus,
                        "mensagem", "Vaga atualizada! Conforme regra de moderação da ETEC, vagas editadas retornam para aprovação da Coordenação."
                )).build();
            } catch (Exception ex) {
                conn.rollback();
                throw ex;
            } finally {
                conn.setAutoCommit(true);
            }
        } catch (Exception e) {
            return Response.serverError().entity(Map.of("sucesso", false, "mensagem", e.getMessage())).build();
        }
    }

    @POST
    @Path("/vagas/{id}/duplicar")
    public Response duplicarVaga(@HeaderParam("Authorization") String authHeader, @PathParam("id") int vagaId) {
        AuthService.UserSession s = exigirEmpresa(authHeader);
        if (s == null) return Response.status(Response.Status.FORBIDDEN).build();

        String novoPrazo = LocalDate.now().plusDays(30).toString();
        String agora = LocalDateTime.now().format(DT_FMT);

        try (Connection conn = db.getConnection()) {
            conn.setAutoCommit(false);
            try {
                int novaVagaId;
                try (PreparedStatement ps = conn.prepareStatement(
                        "INSERT INTO vaga (empresa_id, tipo, titulo, atividades, requisitos, bolsa, beneficios, carga_horaria, horas_dia, horas_semana, turno, modalidade, local, cidade, qtd_vagas, prazo, forma_candidatura, contato_externo, status, confidencial, destaque, criado_em) " +
                        "SELECT empresa_id, tipo, titulo || ' (Cópia)', atividades, requisitos, bolsa, beneficios, carga_horaria, horas_dia, horas_semana, turno, modalidade, local, cidade, qtd_vagas, ?, forma_candidatura, contato_externo, 'rascunho', confidencial, 0, ? " +
                        "FROM vaga WHERE id = ? AND empresa_id = ?",
                        Statement.RETURN_GENERATED_KEYS)) {
                    ps.setString(1, novoPrazo);
                    ps.setString(2, agora);
                    ps.setInt(3, vagaId);
                    ps.setInt(4, s.empresaId());
                    if (ps.executeUpdate() == 0) {
                        conn.rollback();
                        return Response.status(Response.Status.FORBIDDEN).build();
                    }
                    try (ResultSet keys = ps.getGeneratedKeys()) {
                        keys.next();
                        novaVagaId = keys.getInt(1);
                    }
                }

                try (PreparedStatement psVC = conn.prepareStatement(
                        "INSERT INTO vaga_curso (vaga_id, curso_id, modulo_minimo) SELECT ?, curso_id, modulo_minimo FROM vaga_curso WHERE vaga_id = ?")) {
                    psVC.setInt(1, novaVagaId);
                    psVC.setInt(2, vagaId);
                    psVC.executeUpdate();
                }

                conn.commit();
                return Response.ok(Map.of("sucesso", true, "novaVagaId", novaVagaId, "mensagem", "Vaga duplicada como rascunho com prazo renovado!")).build();
            } catch (Exception ex) {
                conn.rollback();
                throw ex;
            } finally {
                conn.setAutoCommit(true);
            }
        } catch (Exception e) {
            return Response.serverError().entity(Map.of("sucesso", false, "mensagem", e.getMessage())).build();
        }
    }

    @POST
    @Path("/vagas/{id}/encerrar")
    @SuppressWarnings("unchecked")
    public Response encerrarVagaEInformarContratados(@HeaderParam("Authorization") String authHeader, @PathParam("id") int vagaId, Map<String, Object> body) {
        AuthService.UserSession s = exigirEmpresa(authHeader);
        if (s == null) return Response.status(Response.Status.FORBIDDEN).build();

        List<Number> contratadosIds = (body != null && body.get("contratadosIds") instanceof List<?> l)
                ? (List<Number>) l : List.of();
        String agora = LocalDateTime.now().format(DT_FMT);

        try (Connection conn = db.getConnection()) {
            conn.setAutoCommit(false);
            try {
                try (PreparedStatement ps = conn.prepareStatement(
                        "UPDATE vaga SET status = 'encerrada', encerrado_em = ? WHERE id = ? AND empresa_id = ?")) {
                    ps.setString(1, agora);
                    ps.setInt(2, vagaId);
                    ps.setInt(3, s.empresaId());
                    if (ps.executeUpdate() == 0) {
                        conn.rollback();
                        return Response.status(Response.Status.FORBIDDEN).build();
                    }
                }

                for (Number cidNum : contratadosIds) {
                    int cid = cidNum.intValue();
                    try (PreparedStatement psC = conn.prepareStatement(
                            "UPDATE candidatura SET contratado = 1, status = 'aprovado' WHERE id = ? AND vaga_id = ?")) {
                        psC.setInt(1, cid);
                        psC.setInt(2, vagaId);
                        psC.executeUpdate();
                    }
                    try (PreparedStatement psH = conn.prepareStatement(
                            "INSERT INTO historico_status (candidatura_id, status, data, usuario_id, observacao) VALUES (?, 'aprovado', ?, ?, 'Candidato informado como contratado no encerramento da vaga.')")) {
                        psH.setInt(1, cid);
                        psH.setString(2, agora);
                        psH.setInt(3, s.usuarioId());
                        psH.executeUpdate();
                    }
                }

                authService.registrarLog(conn, s.usuarioId(), s.nome(), s.perfil(), "ENCERRAMENTO_VAGA_EMPREGABILIDADE",
                        "Vaga #" + vagaId + " encerrada com " + contratadosIds.size() + " contratado(s)", "127.0.0.1");

                conn.commit();
                return Response.ok(Map.of(
                        "sucesso", true,
                        "mensagem", "Vaga encerrada com sucesso! Os dados de contratação já alimentaram o indicador de empregabilidade da ETEC Cuiabá."
                )).build();
            } catch (Exception ex) {
                conn.rollback();
                throw ex;
            } finally {
                conn.setAutoCommit(true);
            }
        } catch (Exception e) {
            return Response.serverError().entity(Map.of("sucesso", false, "mensagem", e.getMessage())).build();
        }
    }

    @GET
    @Path("/vagas/{vagaId}/candidatos")
    public Response listarCandidatosDaVaga(@HeaderParam("Authorization") String authHeader, @PathParam("vagaId") int vagaId) {
        AuthService.UserSession s = exigirEmpresa(authHeader);
        if (s == null) return Response.status(Response.Status.FORBIDDEN).build();

        try (Connection conn = db.getConnection()) {
            // Segurança técnica: checa no servidor se a vaga pertence à empresa logada!
            String tituloVaga;
            try (PreparedStatement psCheck = conn.prepareStatement("SELECT titulo FROM vaga WHERE id = ? AND empresa_id = ?")) {
                psCheck.setInt(1, vagaId);
                psCheck.setInt(2, s.empresaId());
                try (ResultSet rsCheck = psCheck.executeQuery()) {
                    if (!rsCheck.next()) {
                        return Response.status(Response.Status.FORBIDDEN)
                                .entity(Map.of("mensagem", "Acesso negado (LGPD): Você só pode visualizar candidatos das vagas da sua própria empresa.")).build();
                    }
                    tituloVaga = rsCheck.getString("titulo");
                }
            }

            // Regra LGPD: CPF NUNCA aparece para a empresa! Telefone e e-mail só aparecem depois da candidatura.
            String sql = "SELECT c.id as candidatura_id, c.vaga_id, c.aluno_id, c.data, c.status, c.carta, c.observacao_empresa, c.contratado, " +
                         "u.nome as aluno_nome, u.email as aluno_email, a.telefone as aluno_telefone, a.matricula, a.modulo, a.turno, a.egresso, a.data_nasc, " +
                         "cu.nome as curso_nome, cur.resumo, cur.experiencias, cur.formacao, cur.cursos_livres, cur.habilidades, cur.links, cur.pdf_url, cur.pdf_nome " +
                         "FROM candidatura c " +
                         "JOIN aluno a ON a.id = c.aluno_id " +
                         "JOIN usuario u ON u.id = a.usuario_id " +
                         "JOIN curso cu ON cu.id = a.curso_id " +
                         "LEFT JOIN curriculo cur ON cur.aluno_id = a.id " +
                         "WHERE c.vaga_id = ? ORDER BY c.id DESC";

            List<Map<String, Object>> candidatos = new ArrayList<>();
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setInt(1, vagaId);
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        int idade = 18;
                        try {
                            idade = Period.between(LocalDate.parse(rs.getString("data_nasc")), LocalDate.now()).getYears();
                        } catch (Exception ignored) {}

                        Map<String, Object> m = new LinkedHashMap<>();
                        m.put("candidaturaId", rs.getInt("candidatura_id"));
                        m.put("vagaId", rs.getInt("vaga_id"));
                        m.put("alunoId", rs.getInt("aluno_id"));
                        m.put("alunoNome", rs.getString("aluno_nome"));
                        m.put("alunoEmail", rs.getString("aluno_email"));
                        m.put("alunoTelefone", rs.getString("aluno_telefone"));
                        // CPF ocultado intencionalmente em conformidade com a LGPD!
                        m.put("cpfOcultoLgpd", "***.***.***-** (Protegido pela LGPD)");
                        m.put("matricula", rs.getString("matricula"));
                        m.put("cursoNome", rs.getString("curso_nome"));
                        m.put("modulo", rs.getInt("modulo"));
                        m.put("turno", rs.getString("turno"));
                        m.put("egresso", rs.getInt("egresso") == 1);
                        m.put("idade", idade);
                        m.put("menorDeIdade", idade < 18);
                        m.put("dataCandidatura", rs.getString("data"));
                        m.put("status", rs.getString("status"));
                        m.put("carta", rs.getString("carta"));
                        m.put("observacaoEmpresa", rs.getString("observacao_empresa"));
                        m.put("contratado", rs.getInt("contratado") == 1);
                        m.put("resumo", rs.getString("resumo"));
                        m.put("experiencias", rs.getString("experiencias"));
                        m.put("formacao", rs.getString("formacao"));
                        m.put("cursosLivres", rs.getString("cursos_livres"));
                        m.put("habilidades", rs.getString("habilidades"));
                        m.put("links", rs.getString("links"));
                        m.put("temPdf", rs.getString("pdf_url") != null);
                        m.put("pdfNome", rs.getString("pdf_nome"));
                        candidatos.add(m);
                    }
                }
            }

            // Log obrigatório de acesso a dados de alunos (Segurança técnica LGPD)
            authService.registrarLog(conn, s.usuarioId(), s.nome(), s.perfil(), "ACESSO_CANDIDATOS_VAGA_LGPD",
                    "Consultou " + candidatos.size() + " candidato(s) da Vaga #" + vagaId + " (" + tituloVaga + ") — CPF oculto", "127.0.0.1");

            return Response.ok(candidatos).build();
        } catch (Exception e) {
            return Response.serverError().entity(Map.of("erro", e.getMessage())).build();
        }
    }

    @PUT
    @Path("/candidaturas/status-lote")
    @SuppressWarnings("unchecked")
    public Response atualizarStatusCandidatosEmLote(@HeaderParam("Authorization") String authHeader, Map<String, Object> body) {
        AuthService.UserSession s = exigirEmpresa(authHeader);
        if (s == null) return Response.status(Response.Status.FORBIDDEN).build();

        List<Number> ids = (body.get("candidaturaIds") instanceof List<?> l) ? (List<Number>) l : List.of();
        String novoStatus = str(body.get("status"));
        String observacao = str(body.get("observacaoEmpresa"));
        boolean contratado = "aprovado".equalsIgnoreCase(novoStatus) && Boolean.TRUE.equals(body.get("contratado"));

        if (ids.isEmpty() || novoStatus.isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("sucesso", false, "mensagem", "Selecione ao menos um candidato e o novo status.")).build();
        }

        String agora = LocalDateTime.now().format(DT_FMT);
        try (Connection conn = db.getConnection()) {
            conn.setAutoCommit(false);
            try {
                int atualizados = 0;
                for (Number idNum : ids) {
                    int candId = idNum.intValue();
                    // Verifica se a candidatura pertence a uma vaga desta empresa
                    int alunoUsuarioId = 0;
                    String vagaTitulo = "";
                    String vagaTipo = "";
                    try (PreparedStatement psCheck = conn.prepareStatement(
                            "SELECT c.id, a.usuario_id, v.titulo, v.tipo FROM candidatura c " +
                            "JOIN vaga v ON v.id = c.vaga_id JOIN aluno a ON a.id = c.aluno_id " +
                            "WHERE c.id = ? AND v.empresa_id = ?")) {
                        psCheck.setInt(1, candId);
                        psCheck.setInt(2, s.empresaId());
                        try (ResultSet rs = psCheck.executeQuery()) {
                            if (!rs.next()) continue;
                            alunoUsuarioId = rs.getInt("usuario_id");
                            vagaTitulo = rs.getString("titulo");
                            vagaTipo = rs.getString("tipo");
                        }
                    }

                    try (PreparedStatement psUp = conn.prepareStatement(
                            "UPDATE candidatura SET status = ?, observacao_empresa = CASE WHEN ? <> '' THEN ? ELSE observacao_empresa END, " +
                            "contratado = CASE WHEN ? = 1 THEN 1 ELSE contratado END WHERE id = ?")) {
                        psUp.setString(1, novoStatus);
                        psUp.setString(2, observacao);
                        psUp.setString(3, observacao);
                        psUp.setInt(4, ("aprovado".equals(novoStatus) || contratado) ? 1 : 0);
                        psUp.setInt(5, candId);
                        psUp.executeUpdate();
                    }

                    try (PreparedStatement psH = conn.prepareStatement(
                            "INSERT INTO historico_status (candidatura_id, status, data, usuario_id, observacao) VALUES (?, ?, ?, ?, ?)")) {
                        psH.setInt(1, candId);
                        psH.setString(2, novoStatus);
                        psH.setString(3, agora);
                        psH.setInt(4, s.usuarioId());
                        psH.setString(5, "Status atualizado pela empresa para: " + novoStatus);
                        psH.executeUpdate();
                    }

                    // Notifica o aluno sobre mudança de status
                    try (PreparedStatement psN = conn.prepareStatement(
                            "INSERT INTO notificacao (usuario_id, canal, titulo, mensagem, lida, data) VALUES (?, 'SISTEMA_EMAIL', ?, ?, 0, ?)")) {
                        psN.setInt(1, alunoUsuarioId);
                        psN.setString(2, "Atualização na sua candidatura: " + vagaTitulo);
                        psN.setString(3, "O status da sua candidatura mudou para: " + novoStatus.toUpperCase().replace("_", " ") + ".");
                        psN.setString(4, agora);
                        psN.executeUpdate();
                    }

                    // Fluxo do Estágio (Passo 9+): se o aluno foi aprovado em vaga de estágio, cria registro em `estagio` para a Coordenação gerar o Termo
                    boolean isEstagio = vagaTipo.toLowerCase().contains("estágio") || vagaTipo.toLowerCase().contains("estagio");
                    if ("aprovado".equals(novoStatus) && isEstagio) {
                        String inicio = LocalDate.now().plusDays(5).toString();
                        String fim = LocalDate.now().plusMonths(6).plusDays(5).toString();
                        String relatorioData = LocalDate.now().plusMonths(6).toString();
                        try (PreparedStatement psEst = conn.prepareStatement(
                                "INSERT OR IGNORE INTO estagio (candidatura_id, data_inicio, data_fim, supervisor_nome, supervisor_cargo, relatorio_semestral_data, situacao, criado_em) " +
                                "VALUES (?, ?, ?, ?, 'Supervisor Técnico', ?, 'termo_pendente', ?)")) {
                            psEst.setInt(1, candId);
                            psEst.setString(2, inicio);
                            psEst.setString(3, fim);
                            psEst.setString(4, s.nome());
                            psEst.setString(5, relatorioData);
                            psEst.setString(6, agora);
                            psEst.executeUpdate();
                        }
                    }

                    atualizados++;
                }

                authService.registrarLog(conn, s.usuarioId(), s.nome(), s.perfil(), "MUDANCA_STATUS_CANDIDATOS_LOTE",
                        atualizados + " candidatura(s) atualizada(s) para " + novoStatus, "127.0.0.1");

                conn.commit();
                return Response.ok(Map.of(
                        "sucesso", true,
                        "atualizados", atualizados,
                        "mensagem", atualizados + " candidato(s) atualizado(s) para '" + novoStatus + "' com sucesso!"
                )).build();
            } catch (Exception ex) {
                conn.rollback();
                throw ex;
            } finally {
                conn.setAutoCommit(true);
            }
        } catch (Exception e) {
            return Response.serverError().entity(Map.of("sucesso", false, "mensagem", e.getMessage())).build();
        }
    }

    @PUT
    @Path("/dados")
    public Response atualizarDadosEmpresa(@HeaderParam("Authorization") String authHeader, Map<String, Object> body) {
        AuthService.UserSession s = exigirEmpresa(authHeader);
        if (s == null) return Response.status(Response.Status.FORBIDDEN).build();

        try (Connection conn = db.getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "UPDATE empresa SET nome_fantasia = ?, setor = ?, endereco = ?, cidade = ?, telefone = ?, email_contato = ?, responsavel = ? WHERE id = ?")) {
            ps.setString(1, str(body.get("nome_fantasia")));
            ps.setString(2, str(body.get("setor")));
            ps.setString(3, str(body.get("endereco")));
            ps.setString(4, str(body.get("cidade")));
            ps.setString(5, str(body.get("telefone")));
            ps.setString(6, str(body.get("email_contato")));
            ps.setString(7, str(body.get("responsavel")));
            ps.setInt(8, s.empresaId());
            ps.executeUpdate();
            return Response.ok(Map.of("sucesso", true, "mensagem", "Dados cadastrais da empresa atualizados!")).build();
        } catch (Exception e) {
            return Response.serverError().entity(Map.of("sucesso", false, "mensagem", e.getMessage())).build();
        }
    }

    @POST
    @Path("/usuarios")
    public Response adicionarRecrutadorEmpresa(@HeaderParam("Authorization") String authHeader, Map<String, Object> body) {
        AuthService.UserSession s = exigirEmpresa(authHeader);
        if (s == null) return Response.status(Response.Status.FORBIDDEN).build();

        String nome = str(body.get("nome"));
        String login = str(body.get("login")).toLowerCase();
        String email = str(body.get("email"));
        String cargo = str(body.get("cargo"));
        String senha = str(body.get("senha"));

        if (nome.isBlank() || login.isBlank() || email.isBlank() || senha.length() < 6 || !login.matches(".*[a-zA-Z].*")) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("sucesso", false, "mensagem", "Preencha nome, login (com letras), e-mail e senha (mín. 6 caracteres).")).build();
        }

        String agora = LocalDateTime.now().format(DT_FMT);
        try (Connection conn = db.getConnection()) {
            conn.setAutoCommit(false);
            try {
                int novoUserId;
                try (PreparedStatement psU = conn.prepareStatement(
                        "INSERT INTO usuario (login, email, nome, senha_hash, perfil, ativo, ultimo_acesso) VALUES (?, ?, ?, ?, 'EMPRESA', 1, ?)",
                        Statement.RETURN_GENERATED_KEYS)) {
                    psU.setString(1, login);
                    psU.setString(2, email);
                    psU.setString(3, nome);
                    psU.setString(4, BcryptUtil.bcryptHash(senha));
                    psU.setString(5, agora);
                    psU.executeUpdate();
                    try (ResultSet keys = psU.getGeneratedKeys()) {
                        keys.next();
                        novoUserId = keys.getInt(1);
                    }
                }
                try (PreparedStatement psEU = conn.prepareStatement(
                        "INSERT INTO empresa_usuario (empresa_id, usuario_id, cargo) VALUES (?, ?, ?)")) {
                    psEU.setInt(1, s.empresaId());
                    psEU.setInt(2, novoUserId);
                    psEU.setString(3, cargo.isBlank() ? "Recrutador(a)" : cargo);
                    psEU.executeUpdate();
                }
                conn.commit();
                return Response.ok(Map.of("sucesso", true, "mensagem", "Recrutador adicionado à empresa com sucesso!")).build();
            } catch (Exception ex) {
                conn.rollback();
                throw ex;
            } finally {
                conn.setAutoCommit(true);
            }
        } catch (Exception e) {
            return Response.serverError().entity(Map.of("sucesso", false, "mensagem", "Erro ao adicionar usuário (verifique se o login/e-mail já existe).")).build();
        }
    }

    private void salvarCursosDaVaga(Connection conn, int vagaId, List<Map<String, Object>> cursos, int moduloPadrao) throws Exception {
        if (cursos == null) return;
        try (PreparedStatement ps = conn.prepareStatement(
                "INSERT OR IGNORE INTO vaga_curso (vaga_id, curso_id, modulo_minimo) VALUES (?, ?, ?)")) {
            for (Object item : cursos) {
                int cursoId;
                int modMin = moduloPadrao;
                if (item instanceof Map<?, ?> m) {
                    cursoId = intVal(m.get("cursoId") != null ? m.get("cursoId") : m.get("id"), 0);
                    modMin = intVal(m.get("moduloMinimo"), moduloPadrao);
                } else {
                    cursoId = intVal(item, 0);
                }
                if (cursoId > 0) {
                    ps.setInt(1, vagaId);
                    ps.setInt(2, cursoId);
                    ps.setInt(3, modMin);
                    ps.executeUpdate();
                }
            }
        }
    }

    private Map<String, Object> carregarEmpresa(Connection conn, int empresaId) throws Exception {
        try (PreparedStatement ps = conn.prepareStatement("SELECT * FROM empresa WHERE id = ?")) {
            ps.setInt(1, empresaId);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) return Map.of();
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", rs.getInt("id"));
                m.put("cnpj", rs.getString("cnpj"));
                m.put("razaoSocial", rs.getString("razao_social"));
                m.put("nomeFantasia", rs.getString("nome_fantasia"));
                m.put("setor", rs.getString("setor"));
                m.put("endereco", rs.getString("endereco"));
                m.put("cidade", rs.getString("cidade"));
                m.put("telefone", rs.getString("telefone"));
                m.put("emailContato", rs.getString("email_contato"));
                m.put("responsavel", rs.getString("responsavel"));
                m.put("status", rs.getString("status"));
                m.put("motivoRecusa", rs.getString("motivo_recusa"));
                m.put("criadoEm", rs.getString("criado_em"));
                return m;
            }
        }
    }

    private List<Map<String, Object>> listarVagasDaEmpresa(Connection conn, int empresaId) throws Exception {
        List<Map<String, Object>> lista = new ArrayList<>();
        String sql = "SELECT v.*, (SELECT COUNT(*) FROM candidatura c WHERE c.vaga_id = v.id) as total_candidatos " +
                     "FROM vaga v WHERE v.empresa_id = ? ORDER BY v.id DESC";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, empresaId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    int vid = rs.getInt("id");
                    List<Map<String, Object>> cursos = new ArrayList<>();
                    try (PreparedStatement psC = conn.prepareStatement(
                            "SELECT c.id, c.nome, vc.modulo_minimo FROM vaga_curso vc JOIN curso c ON c.id = vc.curso_id WHERE vc.vaga_id = ?")) {
                        psC.setInt(1, vid);
                        try (ResultSet rsC = psC.executeQuery()) {
                            while (rsC.next()) {
                                cursos.add(Map.of(
                                        "id", rsC.getInt("id"),
                                        "nome", rsC.getString("nome"),
                                        "moduloMinimo", rsC.getInt("modulo_minimo")
                                ));
                            }
                        }
                    }

                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", vid);
                    m.put("titulo", rs.getString("titulo"));
                    m.put("tipo", rs.getString("tipo"));
                    m.put("atividades", rs.getString("atividades"));
                    m.put("requisitos", rs.getString("requisitos"));
                    m.put("bolsa", rs.getString("bolsa"));
                    m.put("beneficios", rs.getString("beneficios"));
                    m.put("cargaHoraria", rs.getString("carga_horaria"));
                    m.put("horasDia", rs.getInt("horas_dia"));
                    m.put("horasSemana", rs.getInt("horas_semana"));
                    m.put("turno", rs.getString("turno"));
                    m.put("modalidade", rs.getString("modalidade"));
                    m.put("local", rs.getString("local"));
                    m.put("cidade", rs.getString("cidade"));
                    m.put("qtdVagas", rs.getInt("qtd_vagas"));
                    m.put("prazo", rs.getString("prazo"));
                    m.put("formaCandidatura", rs.getString("forma_candidatura"));
                    m.put("contatoExterno", rs.getString("contato_externo"));
                    m.put("status", rs.getString("status"));
                    m.put("motivoAjuste", rs.getString("motivo_ajuste"));
                    m.put("confidencial", rs.getInt("confidencial") == 1);
                    m.put("destaque", rs.getInt("destaque") == 1);
                    m.put("criadoEm", rs.getString("criado_em"));
                    m.put("totalCandidatos", rs.getInt("total_candidatos"));
                    m.put("cursos", cursos);
                    lista.add(m);
                }
            }
        }
        return lista;
    }

    private List<Map<String, Object>> listarUsuariosDaEmpresa(Connection conn, int empresaId) throws Exception {
        List<Map<String, Object>> lista = new ArrayList<>();
        String sql = "SELECT u.id, u.login, u.email, u.nome, u.ultimo_acesso, eu.cargo " +
                     "FROM empresa_usuario eu JOIN usuario u ON u.id = eu.usuario_id WHERE eu.empresa_id = ?";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, empresaId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", rs.getInt("id"));
                    m.put("login", rs.getString("login"));
                    m.put("email", rs.getString("email"));
                    m.put("nome", rs.getString("nome"));
                    m.put("cargo", rs.getString("cargo"));
                    m.put("ultimoAcesso", rs.getString("ultimo_acesso"));
                    lista.add(m);
                }
            }
        }
        return lista;
    }

    private List<Map<String, Object>> listarNotificacoes(Connection conn, int usuarioId) throws Exception {
        List<Map<String, Object>> lista = new ArrayList<>();
        try (PreparedStatement ps = conn.prepareStatement("SELECT * FROM notificacao WHERE usuario_id = ? ORDER BY id DESC LIMIT 20")) {
            ps.setInt(1, usuarioId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", rs.getInt("id"));
                    m.put("titulo", rs.getString("titulo"));
                    m.put("mensagem", rs.getString("mensagem"));
                    m.put("lida", rs.getInt("lida") == 1);
                    m.put("data", rs.getString("data"));
                    lista.add(m);
                }
            }
        }
        return lista;
    }

    private String str(Object o) {
        return o == null ? "" : o.toString().trim();
    }

    private int intVal(Object o, int def) {
        if (o == null) return def;
        if (o instanceof Number n) return n.intValue();
        try {
            return Integer.parseInt(o.toString().trim());
        } catch (Exception e) {
            return def;
        }
    }
}
