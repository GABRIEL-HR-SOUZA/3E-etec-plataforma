package br.gov.mt.seciteci.etec.resource;

import br.gov.mt.seciteci.etec.config.DatabaseManager;
import br.gov.mt.seciteci.etec.service.AuthService;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.io.File;
import java.io.FileOutputStream;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Path("/api/aluno")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class AlunoPanelResource {

    @Inject
    DatabaseManager db;

    @Inject
    AuthService authService;

    private static final DateTimeFormatter DT_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private AuthService.UserSession exigirAluno(String authHeader) {
        AuthService.UserSession s = authService.validarTokenHeader(authHeader);
        if (s == null || s.alunoId() == null || (!"ALUNO".equals(s.perfil()) && !"EGRESSO".equals(s.perfil()))) {
            return null;
        }
        return s;
    }

    @GET
    @Path("/dashboard")
    public Response getDashboard(@HeaderParam("Authorization") String authHeader) {
        AuthService.UserSession s = exigirAluno(authHeader);
        if (s == null) return Response.status(Response.Status.FORBIDDEN).entity(Map.of("mensagem", "Acesso restrito a alunos e egressos.")).build();

        try (Connection conn = db.getConnection()) {
            Map<String, Object> perfil = carregarPerfilAluno(conn, s.alunoId());
            Map<String, Object> curriculo = carregarCurriculo(conn, s.alunoId());
            List<Map<String, Object>> candidaturas = listarCandidaturasAluno(conn, s.alunoId());
            List<Map<String, Object>> vagasSalvas = listarVagasSalvasAluno(conn, s.alunoId());
            List<Map<String, Object>> notificacoes = listarNotificacoes(conn, s.usuarioId());
            List<Map<String, Object>> estagios = listarEstagiosAluno(conn, s.alunoId());

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("perfil", perfil);
            resp.put("curriculo", curriculo);
            resp.put("candidaturas", candidaturas);
            resp.put("vagasSalvas", vagasSalvas);
            resp.put("notificacoes", notificacoes);
            resp.put("estagios", estagios);
            return Response.ok(resp).build();
        } catch (Exception e) {
            e.printStackTrace();
            return Response.serverError().entity(Map.of("mensagem", e.getMessage())).build();
        }
    }

    @PUT
    @Path("/curriculo")
    public Response salvarCurriculo(@HeaderParam("Authorization") String authHeader, Map<String, Object> body) {
        AuthService.UserSession s = exigirAluno(authHeader);
        if (s == null) return Response.status(Response.Status.FORBIDDEN).build();

        String agora = LocalDateTime.now().format(DT_FMT);
        try (Connection conn = db.getConnection()) {
            try (PreparedStatement psA = conn.prepareStatement(
                    "UPDATE aluno SET telefone = ?, cidade = ?, alerta_email = ?, alerta_whatsapp = ?, consentimento_lgpd = ?, responsavel_nome = ?, responsavel_cpf = ?, ciencia_responsavel = ? WHERE id = ?")) {
                psA.setString(1, str(body.get("telefone")));
                psA.setString(2, str(body.get("cidade")).isBlank() ? "Cuiabá/MT" : str(body.get("cidade")));
                psA.setInt(3, Boolean.TRUE.equals(body.get("alerta_email")) ? 1 : 0);
                psA.setInt(4, Boolean.TRUE.equals(body.get("alerta_whatsapp")) ? 1 : 0);
                psA.setInt(5, Boolean.TRUE.equals(body.get("consentimento_lgpd")) ? 1 : 0);
                psA.setString(6, str(body.get("responsavel_nome")));
                psA.setString(7, str(body.get("responsavel_cpf")));
                psA.setInt(8, Boolean.TRUE.equals(body.get("ciencia_responsavel")) ? 1 : 0);
                psA.setInt(9, s.alunoId());
                psA.executeUpdate();
            }

            try (PreparedStatement psC = conn.prepareStatement(
                    "UPDATE curriculo SET resumo = ?, experiencias = ?, formacao = ?, cursos_livres = ?, habilidades = ?, links = ?, atualizado_em = ? WHERE aluno_id = ?")) {
                psC.setString(1, str(body.get("resumo")));
                psC.setString(2, str(body.get("experiencias")));
                psC.setString(3, str(body.get("formacao")));
                psC.setString(4, str(body.get("cursos_livres")));
                psC.setString(5, str(body.get("habilidades")));
                psC.setString(6, str(body.get("links")));
                psC.setString(7, agora);
                psC.setInt(8, s.alunoId());
                psC.executeUpdate();
            }

            authService.registrarLog(conn, s.usuarioId(), s.nome(), s.perfil(), "ATUALIZACAO_CURRICULO",
                    "Aluno #" + s.alunoId() + " atualizou o currículo e preferências LGPD", "127.0.0.1");

            return Response.ok(Map.of("sucesso", true, "mensagem", "Currículo e preferências atualizados com sucesso!")).build();
        } catch (Exception e) {
            return Response.serverError().entity(Map.of("sucesso", false, "mensagem", e.getMessage())).build();
        }
    }

    @POST
    @Path("/curriculo/pdf")
    public Response uploadCurriculoPdf(@HeaderParam("Authorization") String authHeader, Map<String, Object> body) {
        AuthService.UserSession s = exigirAluno(authHeader);
        if (s == null) return Response.status(Response.Status.FORBIDDEN).build();

        String nomeArquivo = str(body.get("nomeArquivo"));
        String base64Data = str(body.get("base64"));

        if (!nomeArquivo.toLowerCase().endsWith(".pdf") || base64Data.isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("sucesso", false, "mensagem", "Regra de Segurança: O upload só aceita arquivos no formato PDF (.pdf).")).build();
        }

        try {
            if (base64Data.contains(",")) {
                base64Data = base64Data.substring(base64Data.indexOf(",") + 1);
            }
            byte[] bytes = Base64.getDecoder().decode(base64Data);

            // Limite de 5 MB (Regra de Segurança técnica)
            if (bytes.length > 5 * 1024 * 1024) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity(Map.of("sucesso", false, "mensagem", "O arquivo PDF excede o limite máximo permitido de 5 MB.")).build();
            }

            // Valida assinatura mágica %PDF
            if (bytes.length < 4 || bytes[0] != '%' || bytes[1] != 'P' || bytes[2] != 'D' || bytes[3] != 'F') {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity(Map.of("sucesso", false, "mensagem", "Arquivo inválido: o conteúdo não é um documento PDF autêntico.")).build();
            }

            String internalFileName = "curriculo_aluno_" + s.alunoId() + ".pdf";
            File destino = Paths.get(db.getStorageDir(), internalFileName).toFile();
            try (FileOutputStream fos = new FileOutputStream(destino)) {
                fos.write(bytes);
            }

            String agora = LocalDateTime.now().format(DT_FMT);
            try (Connection conn = db.getConnection();
                 PreparedStatement ps = conn.prepareStatement(
                         "UPDATE curriculo SET pdf_url = ?, pdf_nome = ?, atualizado_em = ? WHERE aluno_id = ?")) {
                ps.setString(1, internalFileName);
                ps.setString(2, nomeArquivo);
                ps.setString(3, agora);
                ps.setInt(4, s.alunoId());
                ps.executeUpdate();

                authService.registrarLog(conn, s.usuarioId(), s.nome(), s.perfil(), "UPLOAD_CURRICULO_PDF",
                        "Upload de PDF (" + (bytes.length / 1024) + " KB) armazenado fora da pasta pública", "127.0.0.1");
            }

            return Response.ok(Map.of(
                    "sucesso", true,
                    "pdfNome", nomeArquivo,
                    "mensagem", "Currículo em PDF validado e salvo com segurança fora da pasta pública!"
            )).build();
        } catch (Exception e) {
            return Response.serverError().entity(Map.of("sucesso", false, "mensagem", "Erro ao processar PDF: " + e.getMessage())).build();
        }
    }

    @GET
    @Path("/curriculo/pdf/{alunoId}")
    @Produces("application/pdf")
    public Response baixarCurriculoPdf(@HeaderParam("Authorization") String authHeader, @PathParam("alunoId") int alunoId) {
        AuthService.UserSession s = authService.validarTokenHeader(authHeader);
        if (s == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        try (Connection conn = db.getConnection()) {
            // Verifica permissão (LGPD): só o próprio aluno, a Coordenação/Admin ETEC, ou uma Empresa para a qual o aluno se candidatou!
            boolean autorizado = false;
            if (("ALUNO".equals(s.perfil()) || "EGRESSO".equals(s.perfil())) && s.alunoId() != null && s.alunoId() == alunoId) {
                autorizado = true;
            } else if ("COORDENACAO".equals(s.perfil()) || "ADMIN".equals(s.perfil())) {
                autorizado = true;
            } else if ("EMPRESA".equals(s.perfil()) && s.empresaId() != null) {
                try (PreparedStatement psCheck = conn.prepareStatement(
                        "SELECT c.id FROM candidatura c JOIN vaga v ON v.id = c.vaga_id WHERE c.aluno_id = ? AND v.empresa_id = ?")) {
                    psCheck.setInt(1, alunoId);
                    psCheck.setInt(2, s.empresaId());
                    try (ResultSet rs = psCheck.executeQuery()) {
                        autorizado = rs.next();
                    }
                }
            }

            if (!autorizado) {
                return Response.status(Response.Status.FORBIDDEN).build();
            }

            try (PreparedStatement ps = conn.prepareStatement("SELECT pdf_url, pdf_nome FROM curriculo WHERE aluno_id = ?")) {
                ps.setInt(1, alunoId);
                try (ResultSet rs = ps.executeQuery()) {
                    if (!rs.next() || rs.getString("pdf_url") == null) {
                        return Response.status(Response.Status.NOT_FOUND).build();
                    }
                    File f = Paths.get(db.getStorageDir(), rs.getString("pdf_url")).toFile();
                    if (!f.exists()) {
                        return Response.status(Response.Status.NOT_FOUND).build();
                    }
                    authService.registrarLog(conn, s.usuarioId(), s.nome(), s.perfil(), "DOWNLOAD_CURRICULO_PDF_LGPD",
                            "Acesso ao PDF de currículo do Aluno #" + alunoId, "127.0.0.1");
                    byte[] bytes = Files.readAllBytes(f.toPath());
                    return Response.ok(bytes)
                            .header("Content-Disposition", "attachment; filename=\"" + rs.getString("pdf_nome") + "\"")
                            .build();
                }
            }
        } catch (Exception e) {
            return Response.serverError().build();
        }
    }

    @POST
    @Path("/vagas/{vagaId}/candidatar")
    public Response candidatar(@HeaderParam("Authorization") String authHeader, @PathParam("vagaId") int vagaId, Map<String, Object> body) {
        AuthService.UserSession s = exigirAluno(authHeader);
        if (s == null) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity(Map.of("sucesso", false, "mensagem", "Faça login como aluno ou egresso da ETEC Cuiabá para se candidatar.")).build();
        }

        String carta = body != null ? str(body.get("carta")) : "";
        boolean consentimentoLgpd = body == null || !body.containsKey("consentimento_lgpd") || Boolean.TRUE.equals(body.get("consentimento_lgpd"));
        boolean cienciaResponsavel = body != null && Boolean.TRUE.equals(body.get("ciencia_responsavel"));
        String responsavelNome = body != null ? str(body.get("responsavel_nome")) : "";

        if (!consentimentoLgpd) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("sucesso", false, "mensagem", "LGPD: Para se candidatar, é necessário autorizar o compartilhamento do seu currículo com a empresa desta vaga.")).build();
        }

        String hoje = LocalDate.now().toString();
        String agora = LocalDateTime.now().format(DT_FMT);

        try (Connection conn = db.getConnection()) {
            // 1. Carrega dados do aluno
            int cursoAlunoId;
            int moduloAluno;
            boolean isEgresso;
            String dataNasc;
            int cienciaSalva;
            try (PreparedStatement psA = conn.prepareStatement("SELECT * FROM aluno WHERE id = ?")) {
                psA.setInt(1, s.alunoId());
                try (ResultSet rsA = psA.executeQuery()) {
                    if (!rsA.next()) {
                        return Response.status(Response.Status.NOT_FOUND).entity(Map.of("sucesso", false, "mensagem", "Perfil de aluno não encontrado.")).build();
                    }
                    cursoAlunoId = rsA.getInt("curso_id");
                    moduloAluno = rsA.getInt("modulo");
                    isEgresso = rsA.getInt("egresso") == 1;
                    dataNasc = rsA.getString("data_nasc");
                    cienciaSalva = rsA.getInt("ciencia_responsavel");
                }
            }

            int idade = Period.between(LocalDate.parse(dataNasc), LocalDate.now()).getYears();

            // 2. Carrega dados da vaga
            String tipoVaga;
            String tituloVaga;
            int empresaId;
            try (PreparedStatement psV = conn.prepareStatement(
                    "SELECT v.*, e.status as emp_status FROM vaga v JOIN empresa e ON e.id = v.empresa_id WHERE v.id = ?")) {
                psV.setInt(1, vagaId);
                try (ResultSet rsV = psV.executeQuery()) {
                    if (!rsV.next()) {
                        return Response.status(Response.Status.NOT_FOUND).entity(Map.of("sucesso", false, "mensagem", "Vaga não encontrada.")).build();
                    }
                    if (!"publicada".equals(rsV.getString("status")) || !"aprovada".equals(rsV.getString("emp_status")) || rsV.getString("prazo").compareTo(hoje) < 0) {
                        return Response.status(Response.Status.BAD_REQUEST)
                                .entity(Map.of("sucesso", false, "mensagem", "Esta vaga não está mais aberta para candidaturas.")).build();
                    }
                    tipoVaga = rsV.getString("tipo");
                    tituloVaga = rsV.getString("titulo");
                    empresaId = rsV.getInt("empresa_id");
                }
            }

            boolean isEstagio = tipoVaga.toLowerCase().contains("estágio") || tipoVaga.toLowerCase().contains("estagio");

            // Regra de Negócio #4: Idade mínima de 16 anos (Lei do Estágio)
            if (idade < 16) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity(Map.of("sucesso", false, "mensagem", "Lei do Estágio (11.788/2008): A idade mínima para estágio ou aprendizagem é de 16 anos.")).build();
            }

            // Regra de Negócio #5 e LGPD Menores de Idade: para menores de 18 anos, exige ciência do responsável
            if (idade < 18 && cienciaSalva == 0 && !cienciaResponsavel) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity(Map.of("sucesso", false, "menorSemResponsavel", true,
                                "mensagem", "LGPD (Menor de 18 anos): Como você tem " + idade + " anos, confirme a ciência do seu responsável legal para compartilhar seu currículo.")).build();
            }

            // Regra de Negócio #6: Egresso só se candidata a vagas de emprego. Estágio exige matrícula ativa!
            if (isEgresso && isEstagio) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity(Map.of("sucesso", false, "mensagem", "Regra #6 (Lei do Estágio): Egressos (formados) só podem se candidatar a vagas de emprego (CLT / Temporário). Vagas de estágio exigem matrícula ativa no curso técnico.")).build();
            }

            // Regra de Negócio #7: Curso compatível e módulo mínimo exigido
            boolean cursoCompativel = false;
            int moduloMinimoExigido = 1;
            try (PreparedStatement psVC = conn.prepareStatement(
                    "SELECT modulo_minimo FROM vaga_curso WHERE vaga_id = ? AND curso_id = ?")) {
                psVC.setInt(1, vagaId);
                psVC.setInt(2, cursoAlunoId);
                try (ResultSet rsVC = psVC.executeQuery()) {
                    if (rsVC.next()) {
                        cursoCompativel = true;
                        moduloMinimoExigido = rsVC.getInt("modulo_minimo");
                    }
                }
            }

            if (!cursoCompativel) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity(Map.of("sucesso", false, "mensagem", "Regra #7 (Vínculo ao Curso): Esta vaga é exclusiva para alunos de outro(s) curso(s) técnico(s) da ETEC Cuiabá.")).build();
            }

            if (!isEgresso && moduloAluno < moduloMinimoExigido) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity(Map.of("sucesso", false, "mensagem", "Regra #7 (Módulo Mínimo): Esta vaga exige que o aluno esteja a partir do " + moduloMinimoExigido + "º módulo (você está no " + moduloAluno + "º módulo).")).build();
            }

            // Regra de Negócio #8: Uma candidatura por vaga
            try (PreparedStatement psDup = conn.prepareStatement(
                    "SELECT id, status FROM candidatura WHERE vaga_id = ? AND aluno_id = ?")) {
                psDup.setInt(1, vagaId);
                psDup.setInt(2, s.alunoId());
                try (ResultSet rsDup = psDup.executeQuery()) {
                    if (rsDup.next()) {
                        return Response.status(Response.Status.CONFLICT)
                                .entity(Map.of("sucesso", false, "mensagem", "Regra #8: Você já enviou candidatura para esta vaga (status atual: " + rsDup.getString("status") + ").")).build();
                    }
                }
            }

            conn.setAutoCommit(false);
            try {
                // Salva consentimento LGPD
                try (PreparedStatement psUpA = conn.prepareStatement(
                        "UPDATE aluno SET consentimento_lgpd = 1, consentimento_data = ?, ciencia_responsavel = CASE WHEN ? = 1 THEN 1 ELSE ciencia_responsavel END, " +
                        "responsavel_nome = CASE WHEN ? <> '' THEN ? ELSE responsavel_nome END WHERE id = ?")) {
                    psUpA.setString(1, agora);
                    psUpA.setInt(2, cienciaResponsavel ? 1 : 0);
                    psUpA.setString(3, responsavelNome);
                    psUpA.setString(4, responsavelNome);
                    psUpA.setInt(5, s.alunoId());
                    psUpA.executeUpdate();
                }

                int candidaturaId;
                try (PreparedStatement psIns = conn.prepareStatement(
                        "INSERT INTO candidatura (vaga_id, aluno_id, data, status, carta, contratado) VALUES (?, ?, ?, 'enviada', ?, 0)",
                        Statement.RETURN_GENERATED_KEYS)) {
                    psIns.setInt(1, vagaId);
                    psIns.setInt(2, s.alunoId());
                    psIns.setString(3, agora);
                    psIns.setString(4, carta);
                    psIns.executeUpdate();
                    try (ResultSet keys = psIns.getGeneratedKeys()) {
                        keys.next();
                        candidaturaId = keys.getInt(1);
                    }
                }

                try (PreparedStatement psHist = conn.prepareStatement(
                        "INSERT INTO historico_status (candidatura_id, status, data, usuario_id, observacao) VALUES (?, 'enviada', ?, ?, ?)")) {
                    psHist.setInt(1, candidaturaId);
                    psHist.setString(2, agora);
                    psHist.setInt(3, s.usuarioId());
                    psHist.setString(4, "Candidatura enviada com um clique usando o currículo salvo.");
                    psHist.executeUpdate();
                }

                // Notifica os recrutadores da empresa
                try (PreparedStatement psEmpU = conn.prepareStatement("SELECT usuario_id FROM empresa_usuario WHERE empresa_id = ?")) {
                    psEmpU.setInt(1, empresaId);
                    try (ResultSet rsEU = psEmpU.executeQuery()) {
                        while (rsEU.next()) {
                            try (PreparedStatement psN = conn.prepareStatement(
                                    "INSERT INTO notificacao (usuario_id, canal, titulo, mensagem, lida, data) VALUES (?, 'SISTEMA_EMAIL', ?, ?, 0, ?)")) {
                                psN.setInt(1, rsEU.getInt("usuario_id"));
                                psN.setString(2, "Novo candidato na vaga: " + tituloVaga);
                                psN.setString(3, s.nome() + " enviou candidatura pelo Portal de Vagas ETEC Cuiabá.");
                                psN.setString(4, agora);
                                psN.executeUpdate();
                            }
                        }
                    }
                }

                authService.registrarLog(conn, s.usuarioId(), s.nome(), s.perfil(), "NOVA_CANDIDATURA",
                        "Candidatura #" + candidaturaId + " enviada para a Vaga #" + vagaId + " (" + tituloVaga + ")", "127.0.0.1");

                conn.commit();
                return Response.ok(Map.of(
                        "sucesso", true,
                        "candidaturaId", candidaturaId,
                        "mensagem", "Candidatura enviada com sucesso! Acompanhe cada mudança de status em 'Minhas candidaturas'."
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
    @Path("/candidaturas/{id}/desistir")
    public Response desistirCandidatura(@HeaderParam("Authorization") String authHeader, @PathParam("id") int candidaturaId) {
        AuthService.UserSession s = exigirAluno(authHeader);
        if (s == null) return Response.status(Response.Status.FORBIDDEN).build();

        String agora = LocalDateTime.now().format(DT_FMT);
        try (Connection conn = db.getConnection()) {
            try (PreparedStatement ps = conn.prepareStatement(
                    "UPDATE candidatura SET status = 'desistiu' WHERE id = ? AND aluno_id = ?")) {
                ps.setInt(1, candidaturaId);
                ps.setInt(2, s.alunoId());
                if (ps.executeUpdate() == 0) {
                    return Response.status(Response.Status.NOT_FOUND)
                            .entity(Map.of("sucesso", false, "mensagem", "Candidatura não encontrada.")).build();
                }
            }
            try (PreparedStatement psH = conn.prepareStatement(
                    "INSERT INTO historico_status (candidatura_id, status, data, usuario_id, observacao) VALUES (?, 'desistiu', ?, ?, 'O aluno desistiu da candidatura pelo painel.')")) {
                psH.setInt(1, candidaturaId);
                psH.setString(2, agora);
                psH.setInt(3, s.usuarioId());
                psH.executeUpdate();
            }
            return Response.ok(Map.of("sucesso", true, "mensagem", "Você desistiu da candidatura.")).build();
        } catch (Exception e) {
            return Response.serverError().entity(Map.of("sucesso", false, "mensagem", e.getMessage())).build();
        }
    }

    @POST
    @Path("/vagas/{vagaId}/salvar")
    public Response alternarVagaSalva(@HeaderParam("Authorization") String authHeader, @PathParam("vagaId") int vagaId) {
        AuthService.UserSession s = exigirAluno(authHeader);
        if (s == null) return Response.status(Response.Status.FORBIDDEN).build();

        String agora = LocalDateTime.now().format(DT_FMT);
        try (Connection conn = db.getConnection()) {
            try (PreparedStatement psCheck = conn.prepareStatement("SELECT id FROM vaga_salva WHERE aluno_id = ? AND vaga_id = ?")) {
                psCheck.setInt(1, s.alunoId());
                psCheck.setInt(2, vagaId);
                try (ResultSet rs = psCheck.executeQuery()) {
                    if (rs.next()) {
                        try (PreparedStatement psDel = conn.prepareStatement("DELETE FROM vaga_salva WHERE id = ?")) {
                            psDel.setInt(1, rs.getInt("id"));
                            psDel.executeUpdate();
                        }
                        return Response.ok(Map.of("salva", false, "mensagem", "Vaga removida das suas vagas salvas.")).build();
                    }
                }
            }
            try (PreparedStatement psIns = conn.prepareStatement("INSERT INTO vaga_salva (aluno_id, vaga_id, data) VALUES (?, ?, ?)")) {
                psIns.setInt(1, s.alunoId());
                psIns.setInt(2, vagaId);
                psIns.setString(3, agora);
                psIns.executeUpdate();
            }
            return Response.ok(Map.of("salva", true, "mensagem", "Vaga salva nos seus favoritos!")).build();
        } catch (Exception e) {
            return Response.serverError().entity(Map.of("erro", e.getMessage())).build();
        }
    }

    @PUT
    @Path("/notificacoes/ler-todas")
    public Response marcarNotificacoesComoLidas(@HeaderParam("Authorization") String authHeader) {
        AuthService.UserSession s = authService.validarTokenHeader(authHeader);
        if (s == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        try (Connection conn = db.getConnection();
             PreparedStatement ps = conn.prepareStatement("UPDATE notificacao SET lida = 1 WHERE usuario_id = ?")) {
            ps.setInt(1, s.usuarioId());
            ps.executeUpdate();
            return Response.ok(Map.of("sucesso", true)).build();
        } catch (Exception e) {
            return Response.serverError().build();
        }
    }

    @GET
    @Path("/lgpd/exportar")
    public Response exportarMeusDadosLgpd(@HeaderParam("Authorization") String authHeader) {
        AuthService.UserSession s = exigirAluno(authHeader);
        if (s == null) return Response.status(Response.Status.FORBIDDEN).build();

        try (Connection conn = db.getConnection()) {
            Map<String, Object> pacoteLgpd = new LinkedHashMap<>();
            pacoteLgpd.put("controlador", "Escola Técnica Estadual de Educação Profissional e Tecnológica de Cuiabá (ETEC/SECITECI-MT)");
            pacoteLgpd.put("baseLegal", "Lei Federal nº 13.709/2018 (LGPD) — Portabilidade e Acesso aos Dados do Titular (Art. 18)");
            pacoteLgpd.put("encarregadoDpo", "dpo@secitec.mt.gov.br");
            pacoteLgpd.put("exportadoEm", LocalDateTime.now().format(DT_FMT));
            pacoteLgpd.put("dadosPessoaisAcademicos", carregarPerfilAluno(conn, s.alunoId()));
            pacoteLgpd.put("curriculo", carregarCurriculo(conn, s.alunoId()));
            pacoteLgpd.put("candidaturasCompartilhadas", listarCandidaturasAluno(conn, s.alunoId()));

            authService.registrarLog(conn, s.usuarioId(), s.nome(), s.perfil(), "EXPORTACAO_DADOS_TITULAR_LGPD",
                    "O titular baixou cópia integral de seus dados pessoais (Art. 18 LGPD)", "127.0.0.1");

            return Response.ok(pacoteLgpd).build();
        } catch (Exception e) {
            return Response.serverError().build();
        }
    }

    @DELETE
    @Path("/lgpd/excluir-conta")
    public Response excluirMinhaContaLgpd(@HeaderParam("Authorization") String authHeader) {
        AuthService.UserSession s = exigirAluno(authHeader);
        if (s == null) return Response.status(Response.Status.FORBIDDEN).build();

        try (Connection conn = db.getConnection()) {
            authService.registrarLog(conn, s.usuarioId(), s.nome(), s.perfil(), "EXCLUSAO_CONTA_TITULAR_LGPD",
                    "O aluno #" + s.alunoId() + " solicitou a exclusão de sua conta e dados do portal (Art. 18 LGPD)", "127.0.0.1");
            try (PreparedStatement ps = conn.prepareStatement("DELETE FROM usuario WHERE id = ?")) {
                ps.setInt(1, s.usuarioId());
                ps.executeUpdate();
            }
            return Response.ok(Map.of("sucesso", true, "mensagem", "Sua conta, currículo e candidaturas foram excluídos permanentemente conforme a LGPD.")).build();
        } catch (Exception e) {
            return Response.serverError().build();
        }
    }

    private Map<String, Object> carregarPerfilAluno(Connection conn, int alunoId) throws Exception {
        String sql = "SELECT a.*, u.nome, u.email, u.cpf, u.login, c.nome as curso_nome, c.eixo as curso_eixo " +
                     "FROM aluno a JOIN usuario u ON u.id = a.usuario_id JOIN curso c ON c.id = a.curso_id WHERE a.id = ?";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, alunoId);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) return Map.of();
                String dataNasc = rs.getString("data_nasc");
                int idade = 18;
                try {
                    idade = Period.between(LocalDate.parse(dataNasc), LocalDate.now()).getYears();
                } catch (Exception ignored) {}

                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", rs.getInt("id"));
                m.put("usuarioId", rs.getInt("usuario_id"));
                m.put("nome", rs.getString("nome"));
                m.put("email", rs.getString("email"));
                m.put("cpf", rs.getString("cpf"));
                m.put("matricula", rs.getString("matricula"));
                m.put("cursoId", rs.getInt("curso_id"));
                m.put("cursoNome", rs.getString("curso_nome"));
                m.put("cursoEixo", rs.getString("curso_eixo"));
                m.put("modulo", rs.getInt("modulo"));
                m.put("turno", rs.getString("turno"));
                m.put("dataNasc", dataNasc);
                m.put("idade", idade);
                m.put("menorDeIdade", idade < 18);
                m.put("egresso", rs.getInt("egresso") == 1);
                m.put("telefone", rs.getString("telefone"));
                m.put("cidade", rs.getString("cidade"));
                m.put("alertaEmail", rs.getInt("alerta_email") == 1);
                m.put("alertaWhatsapp", rs.getInt("alerta_whatsapp") == 1);
                m.put("consentimentoLgpd", rs.getInt("consentimento_lgpd") == 1);
                m.put("consentimentoData", rs.getString("consentimento_data"));
                m.put("responsavelNome", rs.getString("responsavel_nome"));
                m.put("responsavelCpf", rs.getString("responsavel_cpf"));
                m.put("cienciaResponsavel", rs.getInt("ciencia_responsavel") == 1);
                return m;
            }
        }
    }

    private Map<String, Object> carregarCurriculo(Connection conn, int alunoId) throws Exception {
        try (PreparedStatement ps = conn.prepareStatement("SELECT * FROM curriculo WHERE aluno_id = ?")) {
            ps.setInt(1, alunoId);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) return Map.of();
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", rs.getInt("id"));
                m.put("resumo", rs.getString("resumo"));
                m.put("experiencias", rs.getString("experiencias"));
                m.put("formacao", rs.getString("formacao"));
                m.put("cursosLivres", rs.getString("cursos_livres"));
                m.put("habilidades", rs.getString("habilidades"));
                m.put("links", rs.getString("links"));
                m.put("pdfUrl", rs.getString("pdf_url"));
                m.put("pdfNome", rs.getString("pdf_nome"));
                m.put("atualizadoEm", rs.getString("atualizado_em"));
                return m;
            }
        }
    }

    private List<Map<String, Object>> listarCandidaturasAluno(Connection conn, int alunoId) throws Exception {
        List<Map<String, Object>> lista = new ArrayList<>();
        String sql = "SELECT c.*, v.titulo as vaga_titulo, v.tipo as vaga_tipo, v.bolsa, v.turno as vaga_turno, " +
                     "v.local as vaga_local, v.confidencial, e.nome_fantasia " +
                     "FROM candidatura c JOIN vaga v ON v.id = c.vaga_id JOIN empresa e ON e.id = v.empresa_id " +
                     "WHERE c.aluno_id = ? ORDER BY c.id DESC";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, alunoId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    int candId = rs.getInt("id");
                    boolean conf = rs.getInt("confidencial") == 1;
                    List<Map<String, Object>> historico = new ArrayList<>();
                    try (PreparedStatement psH = conn.prepareStatement(
                            "SELECT status, data, observacao FROM historico_status WHERE candidatura_id = ? ORDER BY id ASC")) {
                        psH.setInt(1, candId);
                        try (ResultSet rsH = psH.executeQuery()) {
                            while (rsH.next()) {
                                historico.add(Map.of(
                                        "status", rsH.getString("status"),
                                        "data", rsH.getString("data"),
                                        "observacao", rsH.getString("observacao") != null ? rsH.getString("observacao") : ""
                                ));
                            }
                        }
                    }

                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", candId);
                    m.put("vagaId", rs.getInt("vaga_id"));
                    m.put("vagaTitulo", rs.getString("vaga_titulo"));
                    m.put("vagaTipo", rs.getString("vaga_tipo"));
                    m.put("bolsa", rs.getString("bolsa"));
                    m.put("vagaTurno", rs.getString("vaga_turno"));
                    m.put("vagaLocal", rs.getString("vaga_local"));
                    m.put("empresaNome", conf ? "Confidencial (Empresa Parceira ETEC)" : rs.getString("nome_fantasia"));
                    m.put("data", rs.getString("data"));
                    m.put("status", rs.getString("status"));
                    m.put("carta", rs.getString("carta"));
                    m.put("contratado", rs.getInt("contratado") == 1);
                    m.put("historico", historico);
                    lista.add(m);
                }
            }
        }
        return lista;
    }

    private List<Map<String, Object>> listarVagasSalvasAluno(Connection conn, int alunoId) throws Exception {
        List<Map<String, Object>> lista = new ArrayList<>();
        String sql = "SELECT vs.id as salvo_id, vs.data as salvo_em, v.id as vaga_id, v.titulo, v.tipo, v.bolsa, v.prazo, v.turno, v.confidencial, e.nome_fantasia " +
                     "FROM vaga_salva vs JOIN vaga v ON v.id = vs.vaga_id JOIN empresa e ON e.id = v.empresa_id " +
                     "WHERE vs.aluno_id = ? ORDER BY vs.id DESC";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, alunoId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("vagaId", rs.getInt("vaga_id"));
                    m.put("titulo", rs.getString("titulo"));
                    m.put("tipo", rs.getString("tipo"));
                    m.put("bolsa", rs.getString("bolsa"));
                    m.put("prazo", rs.getString("prazo"));
                    m.put("turno", rs.getString("turno"));
                    m.put("empresaNome", rs.getInt("confidencial") == 1 ? "Confidencial" : rs.getString("nome_fantasia"));
                    m.put("salvoEm", rs.getString("salvo_em"));
                    lista.add(m);
                }
            }
        }
        return lista;
    }

    private List<Map<String, Object>> listarNotificacoes(Connection conn, int usuarioId) throws Exception {
        List<Map<String, Object>> lista = new ArrayList<>();
        try (PreparedStatement ps = conn.prepareStatement("SELECT * FROM notificacao WHERE usuario_id = ? ORDER BY id DESC LIMIT 30")) {
            ps.setInt(1, usuarioId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", rs.getInt("id"));
                    m.put("canal", rs.getString("canal"));
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

    private List<Map<String, Object>> listarEstagiosAluno(Connection conn, int alunoId) throws Exception {
        List<Map<String, Object>> lista = new ArrayList<>();
        String sql = "SELECT es.*, v.titulo as vaga_titulo, v.bolsa, v.carga_horaria, e.nome_fantasia as empresa_nome " +
                     "FROM estagio es JOIN candidatura c ON c.id = es.candidatura_id " +
                     "JOIN vaga v ON v.id = c.vaga_id JOIN empresa e ON e.id = v.empresa_id " +
                     "WHERE c.aluno_id = ? ORDER BY es.id DESC";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, alunoId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", rs.getInt("id"));
                    m.put("candidaturaId", rs.getInt("candidatura_id"));
                    m.put("vagaTitulo", rs.getString("vaga_titulo"));
                    m.put("empresaNome", rs.getString("empresa_nome"));
                    m.put("bolsa", rs.getString("bolsa"));
                    m.put("cargaHoraria", rs.getString("carga_horaria"));
                    m.put("dataInicio", rs.getString("data_inicio"));
                    m.put("dataFim", rs.getString("data_fim"));
                    m.put("supervisorNome", rs.getString("supervisor_nome"));
                    m.put("assinaturas", rs.getString("assinaturas"));
                    m.put("relatorioSemestralData", rs.getString("relatorio_semestral_data"));
                    m.put("relatorioSemestralStatus", rs.getString("relatorio_semestral_status"));
                    m.put("situacao", rs.getString("situacao"));
                    lista.add(m);
                }
            }
        }
        return lista;
    }

    private String str(Object o) {
        return o == null ? "" : o.toString().trim();
    }
}
