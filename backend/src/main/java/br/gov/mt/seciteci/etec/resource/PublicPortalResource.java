package br.gov.mt.seciteci.etec.resource;

import br.gov.mt.seciteci.etec.config.DatabaseManager;
import br.gov.mt.seciteci.etec.service.AuthService;
import io.quarkus.elytron.security.common.BcryptUtil;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Path("/api/public")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class PublicPortalResource {

    @Inject
    DatabaseManager db;

    @Inject
    AuthService authService;

    private static final DateTimeFormatter DT_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @GET
    @Path("/cursos")
    public Response listarCursosComContador() {
        String hoje = LocalDate.now().toString();
        List<Map<String, Object>> lista = new ArrayList<>();
        String sql = "SELECT c.id, c.nome, c.slug, c.eixo, c.duracao_modulos, c.turno_padrao, " +
                     "(SELECT COUNT(DISTINCT v.id) FROM vaga v " +
                     " JOIN vaga_curso vc ON vc.vaga_id = v.id " +
                     " JOIN empresa e ON e.id = v.empresa_id " +
                     " WHERE vc.curso_id = c.id AND v.status = 'publicada' AND v.prazo >= ? AND e.status = 'aprovada') AS vagas_abertas " +
                     "FROM curso c WHERE c.ativo = 1 ORDER BY c.nome";
        try (Connection conn = db.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, hoje);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", rs.getInt("id"));
                    m.put("nome", rs.getString("nome"));
                    m.put("slug", rs.getString("slug"));
                    m.put("eixo", rs.getString("eixo"));
                    m.put("duracaoModulos", rs.getInt("duracao_modulos"));
                    m.put("turnoPadrao", rs.getString("turno_padrao"));
                    m.put("vagasAbertas", rs.getInt("vagas_abertas"));
                    lista.add(m);
                }
            }
            return Response.ok(lista).build();
        } catch (Exception e) {
            return Response.serverError().entity(Map.of("erro", e.getMessage())).build();
        }
    }

    @GET
    @Path("/vagas")
    public Response listarVagasPublicas(
            @QueryParam("busca") String busca,
            @QueryParam("cursoId") Integer cursoId,
            @QueryParam("eixo") String eixo,
            @QueryParam("tipo") String tipo,
            @QueryParam("turno") String turno,
            @QueryParam("modalidade") String modalidade,
            @QueryParam("cidade") String cidade,
            @QueryParam("destaque") Boolean destaque
    ) {
        String hoje = LocalDate.now().toString();
        List<Map<String, Object>> vagas = new ArrayList<>();

        StringBuilder sql = new StringBuilder(
                "SELECT DISTINCT v.*, e.nome_fantasia, e.setor AS empresa_setor " +
                "FROM vaga v " +
                "JOIN empresa e ON e.id = v.empresa_id " +
                "LEFT JOIN vaga_curso vc ON vc.vaga_id = v.id " +
                "LEFT JOIN curso c ON c.id = vc.curso_id " +
                "WHERE v.status = 'publicada' AND v.prazo >= ? AND e.status = 'aprovada' "
        );
        List<Object> params = new ArrayList<>();
        params.add(hoje);

        if (busca != null && !busca.isBlank()) {
            sql.append("AND (lower(v.titulo) LIKE ? OR lower(v.atividades) LIKE ? OR lower(v.requisitos) LIKE ? OR lower(c.nome) LIKE ?) ");
            String like = "%" + busca.trim().toLowerCase() + "%";
            params.add(like);
            params.add(like);
            params.add(like);
            params.add(like);
        }
        if (cursoId != null && cursoId > 0) {
            sql.append("AND vc.curso_id = ? ");
            params.add(cursoId);
        }
        if (eixo != null && !eixo.isBlank()) {
            sql.append("AND lower(c.eixo) = lower(?) ");
            params.add(eixo.trim());
        }
        if (tipo != null && !tipo.isBlank()) {
            sql.append("AND lower(v.tipo) = lower(?) ");
            params.add(tipo.trim());
        }
        if (turno != null && !turno.isBlank()) {
            sql.append("AND lower(v.turno) = lower(?) ");
            params.add(turno.trim());
        }
        if (modalidade != null && !modalidade.isBlank()) {
            sql.append("AND lower(v.modalidade) = lower(?) ");
            params.add(modalidade.trim());
        }
        if (cidade != null && !cidade.isBlank()) {
            sql.append("AND lower(v.cidade) LIKE ? ");
            params.add("%" + cidade.trim().toLowerCase() + "%");
        }
        if (Boolean.TRUE.equals(destaque)) {
            sql.append("AND v.destaque = 1 ");
        }

        sql.append("ORDER BY v.destaque DESC, v.id DESC");

        try (Connection conn = db.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql.toString())) {
            for (int i = 0; i < params.size(); i++) {
                ps.setObject(i + 1, params.get(i));
            }
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    vagas.add(mapearVagaPublica(conn, rs));
                }
            }
            return Response.ok(vagas).build();
        } catch (Exception e) {
            e.printStackTrace();
            return Response.serverError().entity(Map.of("erro", e.getMessage())).build();
        }
    }

    @GET
    @Path("/vagas/{id}")
    public Response detalheVagaPublica(@PathParam("id") int id) {
        String hoje = LocalDate.now().toString();
        String sql = "SELECT v.*, e.nome_fantasia, e.setor AS empresa_setor " +
                     "FROM vaga v JOIN empresa e ON e.id = v.empresa_id " +
                     "WHERE v.id = ? AND v.status = 'publicada' AND v.prazo >= ? AND e.status = 'aprovada'";
        try (Connection conn = db.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, id);
            ps.setString(2, hoje);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) {
                    return Response.status(Response.Status.NOT_FOUND)
                            .entity(Map.of("mensagem", "Vaga não encontrada ou já encerrada.")).build();
                }
                return Response.ok(mapearVagaPublica(conn, rs)).build();
            }
        } catch (Exception e) {
            return Response.serverError().entity(Map.of("erro", e.getMessage())).build();
        }
    }

    @POST
    @Path("/vagas/{id}/denunciar")
    public Response denunciarVaga(@PathParam("id") int vagaId, Map<String, Object> body) {
        String motivo = body != null && body.get("motivo") != null ? body.get("motivo").toString().trim() : "";
        String descricao = body != null && body.get("descricao") != null ? body.get("descricao").toString().trim() : "";
        String nome = body != null && body.get("nome") != null ? body.get("nome").toString().trim() : "Anônimo";
        String contato = body != null && body.get("contato") != null ? body.get("contato").toString().trim() : "";

        if (motivo.isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("sucesso", false, "mensagem", "Selecione o motivo da denúncia.")).build();
        }

        String agora = LocalDateTime.now().format(DT_FMT);
        try (Connection conn = db.getConnection()) {
            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO denuncia (vaga_id, motivo, descricao, denunciante_nome, denunciante_contato, situacao, data) VALUES (?, ?, ?, ?, ?, 'pendente', ?)")) {
                ps.setInt(1, vagaId);
                ps.setString(2, motivo);
                ps.setString(3, descricao);
                ps.setString(4, nome.isBlank() ? "Anônimo" : nome);
                ps.setString(5, contato);
                ps.setString(6, agora);
                ps.executeUpdate();
            }

            // Notifica Coordenação ETEC
            try (PreparedStatement psN = conn.prepareStatement(
                    "INSERT INTO notificacao (usuario_id, canal, titulo, mensagem, lida, data) VALUES (1, 'SISTEMA_EMAIL', ?, ?, 0, ?)")) {
                psN.setString(1, "Nova denúncia na Vaga #" + vagaId);
                psN.setString(2, "Motivo: " + motivo + ". Verifique a fila de moderação.");
                psN.setString(3, agora);
                psN.executeUpdate();
            }

            authService.registrarLog(conn, null, nome, "VISITANTE/ALUNO", "DENUNCIA_VAGA",
                    "Denúncia registrada na Vaga #" + vagaId + ": " + motivo, "127.0.0.1");

            return Response.ok(Map.of(
                    "sucesso", true,
                    "mensagem", "Denúncia enviada para a fila da Coordenação de Estágio da ETEC Cuiabá. Obrigado por ajudar a manter o portal seguro!"
            )).build();
        } catch (Exception e) {
            return Response.serverError().entity(Map.of("sucesso", false, "mensagem", e.getMessage())).build();
        }
    }

    @POST
    @Path("/empresas/cadastro")
    public Response cadastrarEmpresa(Map<String, Object> body) {
        if (body == null) {
            return Response.status(Response.Status.BAD_REQUEST).entity(Map.of("sucesso", false, "mensagem", "Dados inválidos.")).build();
        }
        String cnpj = str(body.get("cnpj"));
        String razaoSocial = str(body.get("razao_social"));
        String nomeFantasia = str(body.get("nome_fantasia"));
        String setor = str(body.get("setor"));
        String endereco = str(body.get("endereco"));
        String cidade = str(body.get("cidade"));
        String telefone = str(body.get("telefone"));
        String email = str(body.get("email"));
        String responsavel = str(body.get("responsavel"));
        String cargo = str(body.get("cargo"));
        String login = str(body.get("login")).toLowerCase();
        String senha = str(body.get("senha"));
        boolean aceiteTermos = Boolean.TRUE.equals(body.get("aceite_termos"));

        if (cnpj.isBlank() || razaoSocial.isBlank() || nomeFantasia.isBlank() || endereco.isBlank() ||
            telefone.isBlank() || email.isBlank() || responsavel.isBlank() || login.isBlank() || senha.isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("sucesso", false, "mensagem", "Preencha todos os campos obrigatórios do cadastro da empresa.")).build();
        }

        // Regra do Login Unificado: "Para não haver conflito, o login de empresa precisa ter pelo menos uma letra" e não conter @
        if (!login.matches(".*[a-zA-Z].*") || login.contains("@")) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("sucesso", false, "mensagem", "O login da empresa deve conter pelo menos uma letra e não pode ser um e-mail ou apenas números.")).build();
        }

        if (senha.length() < 6) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("sucesso", false, "mensagem", "A senha deve ter no mínimo 6 caracteres.")).build();
        }

        if (!aceiteTermos) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("sucesso", false, "mensagem", "É obrigatório aceitar os Termos de Uso, a Lei do Estágio e a Política de Privacidade (LGPD).")).build();
        }

        String agora = LocalDateTime.now().format(DT_FMT);
        try (Connection conn = db.getConnection()) {
            conn.setAutoCommit(false);
            try {
                // Verifica duplicidade de CNPJ, login ou email
                try (PreparedStatement psCheck = conn.prepareStatement(
                        "SELECT id FROM empresa WHERE cnpj = ? UNION SELECT id FROM usuario WHERE lower(login) = lower(?) OR lower(email) = lower(?)")) {
                    psCheck.setString(1, cnpj);
                    psCheck.setString(2, login);
                    psCheck.setString(3, email);
                    try (ResultSet rs = psCheck.executeQuery()) {
                        if (rs.next()) {
                            conn.rollback();
                            return Response.status(Response.Status.CONFLICT)
                                    .entity(Map.of("sucesso", false, "mensagem", "Já existe uma empresa ou usuário cadastrado com este CNPJ, login ou e-mail.")).build();
                        }
                    }
                }

                int empresaId;
                try (PreparedStatement psEmp = conn.prepareStatement(
                        "INSERT INTO empresa (cnpj, razao_social, nome_fantasia, setor, endereco, cidade, telefone, email_contato, responsavel, status, aceite_termos, criado_em) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente', 1, ?)", Statement.RETURN_GENERATED_KEYS)) {
                    psEmp.setString(1, cnpj);
                    psEmp.setString(2, razaoSocial);
                    psEmp.setString(3, nomeFantasia);
                    psEmp.setString(4, setor.isBlank() ? "Comércio e Serviços" : setor);
                    psEmp.setString(5, endereco);
                    psEmp.setString(6, cidade.isBlank() ? "Cuiabá/MT" : cidade);
                    psEmp.setString(7, telefone);
                    psEmp.setString(8, email);
                    psEmp.setString(9, responsavel);
                    psEmp.setString(10, agora);
                    psEmp.executeUpdate();
                    try (ResultSet keys = psEmp.getGeneratedKeys()) {
                        keys.next();
                        empresaId = keys.getInt(1);
                    }
                }

                int userId;
                try (PreparedStatement psUser = conn.prepareStatement(
                        "INSERT INTO usuario (login, email, nome, senha_hash, perfil, ativo, ultimo_acesso) VALUES (?, ?, ?, ?, 'EMPRESA', 1, ?)",
                        Statement.RETURN_GENERATED_KEYS)) {
                    psUser.setString(1, login);
                    psUser.setString(2, email);
                    psUser.setString(3, responsavel + " (" + nomeFantasia + ")");
                    psUser.setString(4, BcryptUtil.bcryptHash(senha));
                    psUser.setString(5, agora);
                    psUser.executeUpdate();
                    try (ResultSet keys = psUser.getGeneratedKeys()) {
                        keys.next();
                        userId = keys.getInt(1);
                    }
                }

                try (PreparedStatement psEu = conn.prepareStatement(
                        "INSERT INTO empresa_usuario (empresa_id, usuario_id, cargo) VALUES (?, ?, ?)")) {
                    psEu.setInt(1, empresaId);
                    psEu.setInt(2, userId);
                    psEu.setString(3, cargo.isBlank() ? "Responsável / RH" : cargo);
                    psEu.executeUpdate();
                }

                // Notifica Coordenação ETEC
                try (PreparedStatement psNotif = conn.prepareStatement(
                        "INSERT INTO notificacao (usuario_id, canal, titulo, mensagem, lida, data) VALUES (1, 'SISTEMA_EMAIL', ?, ?, 0, ?)")) {
                    psNotif.setString(1, "Nova empresa aguardando aprovação: " + nomeFantasia);
                    psNotif.setString(2, "CNPJ: " + cnpj + " | Responsável: " + responsavel + ". Acesse a Fila de Aprovação.");
                    psNotif.setString(3, agora);
                    psNotif.executeUpdate();
                }

                authService.registrarLog(conn, userId, responsavel, "EMPRESA", "CADASTRO_EMPRESA_PENDENTE",
                        "Empresa '" + nomeFantasia + "' (CNPJ " + cnpj + ") enviada para fila da Coordenação ETEC", "127.0.0.1");

                conn.commit();
                return Response.ok(Map.of(
                        "sucesso", true,
                        "empresaId", empresaId,
                        "login", login,
                        "mensagem", "Cadastro recebido com sucesso! Sua empresa entrou na fila de aprovação da Coordenação de Estágio da ETEC Cuiabá. Você já pode acessar o painel com seu login '" + login + "' para acompanhar o status e preparar rascunhos de vagas."
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

    private Map<String, Object> mapearVagaPublica(Connection conn, ResultSet rs) throws Exception {
        int id = rs.getInt("id");
        boolean confidencial = rs.getInt("confidencial") == 1;
        String empresaNome = confidencial ? "Confidencial (Empresa Parceira Homologada ETEC)" : rs.getString("nome_fantasia");
        String prazoStr = rs.getString("prazo");
        String publicadoStr = rs.getString("publicado_em") != null ? rs.getString("publicado_em") : rs.getString("criado_em");

        long diasRestantes = 15;
        try {
            diasRestantes = ChronoUnit.DAYS.between(LocalDate.now(), LocalDate.parse(prazoStr));
        } catch (Exception ignored) {}

        boolean isNova = true;
        try {
            String dataPub = publicadoStr.length() >= 10 ? publicadoStr.substring(0, 10) : publicadoStr;
            isNova = ChronoUnit.DAYS.between(LocalDate.parse(dataPub), LocalDate.now()) <= 5;
        } catch (Exception ignored) {}

        List<Map<String, Object>> cursos = new ArrayList<>();
        try (PreparedStatement psC = conn.prepareStatement(
                "SELECT c.id, c.nome, c.slug, c.eixo, vc.modulo_minimo FROM vaga_curso vc JOIN curso c ON c.id = vc.curso_id WHERE vc.vaga_id = ?")) {
            psC.setInt(1, id);
            try (ResultSet rsC = psC.executeQuery()) {
                while (rsC.next()) {
                    Map<String, Object> cm = new LinkedHashMap<>();
                    cm.put("id", rsC.getInt("id"));
                    cm.put("nome", rsC.getString("nome"));
                    cm.put("slug", rsC.getString("slug"));
                    cm.put("eixo", rsC.getString("eixo"));
                    cm.put("moduloMinimo", rsC.getInt("modulo_minimo"));
                    cursos.add(cm);
                }
            }
        }

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("titulo", rs.getString("titulo"));
        m.put("empresaNome", empresaNome);
        m.put("empresaSetor", rs.getString("empresa_setor"));
        m.put("confidencial", confidencial);
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
        m.put("prazo", prazoStr);
        m.put("formaCandidatura", rs.getString("forma_candidatura"));
        m.put("contatoExterno", rs.getString("contato_externo"));
        m.put("destaque", rs.getInt("destaque") == 1);
        m.put("publicadoEm", publicadoStr);
        m.put("nova", isNova);
        m.put("diasRestantes", diasRestantes);
        m.put("cursos", cursos);
        return m;
    }

    private String str(Object o) {
        return o == null ? "" : o.toString().trim();
    }
}
