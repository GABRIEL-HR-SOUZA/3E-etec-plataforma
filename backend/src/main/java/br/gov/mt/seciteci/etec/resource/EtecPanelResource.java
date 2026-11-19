package br.gov.mt.seciteci.etec.resource;

import br.gov.mt.seciteci.etec.config.DatabaseManager;
import br.gov.mt.seciteci.etec.service.AuthService;
import br.gov.mt.seciteci.etec.service.PdfService;
import br.gov.mt.seciteci.etec.service.VagaValidator;
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

import java.nio.charset.StandardCharsets;
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

@Path("/api/etec")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class EtecPanelResource {

    @Inject
    DatabaseManager db;

    @Inject
    AuthService authService;

    @Inject
    PdfService pdfService;

    @Inject
    VagaValidator vagaValidator;

    private static final DateTimeFormatter DT_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private AuthService.UserSession exigirEtec(String authHeader) {
        AuthService.UserSession s = authService.validarTokenHeader(authHeader);
        if (s == null || (!"COORDENACAO".equals(s.perfil()) && !"ADMIN".equals(s.perfil()))) {
            return null;
        }
        return s;
    }

    @GET
    @Path("/dashboard")
    public Response getDashboardCompleto(@HeaderParam("Authorization") String authHeader) {
        AuthService.UserSession s = exigirEtec(authHeader);
        if (s == null) return Response.status(Response.Status.FORBIDDEN).entity(Map.of("mensagem", "Acesso restrito à Coordenação de Estágio e TI da ETEC.")).build();

        try (Connection conn = db.getConnection()) {
            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("empresas", listarEmpresas(conn));
            resp.put("vagas", listarTodasVagas(conn));
            resp.put("alunos", listarAlunos(conn));
            resp.put("baseSecretaria", listarBaseSecretaria(conn));
            resp.put("estagios", listarEstagios(conn));
            resp.put("denuncias", listarDenuncias(conn));
            resp.put("relatorios", calcularRelatoriosIndicadores(conn));
            resp.put("logs", listarLogsAuditoria(conn));
            resp.put("usuarios", listarUsuariosSistema(conn));
            resp.put("configuracoes", listarConfiguracoes(conn));
            return Response.ok(resp).build();
        } catch (Exception e) {
            e.printStackTrace();
            return Response.serverError().entity(Map.of("mensagem", e.getMessage())).build();
        }
    }

    @PUT
    @Path("/empresas/{id}/moderar")
    public Response moderarEmpresa(@HeaderParam("Authorization") String authHeader, @PathParam("id") int empresaId, Map<String, Object> body) {
        AuthService.UserSession s = exigirEtec(authHeader);
        if (s == null) return Response.status(Response.Status.FORBIDDEN).build();

        String acao = str(body.get("acao")); // aprovar, recusar, bloquear
        String motivo = str(body.get("motivo"));
        String novoStatus = switch (acao.toLowerCase()) {
            case "aprovar", "aprovada" -> "aprovada";
            case "bloquear", "bloqueada" -> "bloqueada";
            default -> "recusada";
        };

        String agora = LocalDateTime.now().format(DT_FMT);
        try (Connection conn = db.getConnection()) {
            conn.setAutoCommit(false);
            try {
                try (PreparedStatement ps = conn.prepareStatement(
                        "UPDATE empresa SET status = ?, motivo_recusa = ? WHERE id = ?")) {
                    ps.setString(1, novoStatus);
                    ps.setString(2, motivo.isBlank() ? null : motivo);
                    ps.setInt(3, empresaId);
                    ps.executeUpdate();
                }

                // Regra de Negócio #9: "Empresa bloqueada: todas as vagas dela saem do ar na hora."
                int vagasEncerradas = 0;
                if ("bloqueada".equals(novoStatus)) {
                    try (PreparedStatement psV = conn.prepareStatement(
                            "UPDATE vaga SET status = 'encerrada', encerrado_em = ? WHERE empresa_id = ? AND status IN ('publicada', 'aguardando_aprovacao')")) {
                        psV.setString(1, agora);
                        psV.setInt(2, empresaId);
                        vagasEncerradas = psV.executeUpdate();
                    }
                }

                // Notifica os usuários da empresa
                try (PreparedStatement psU = conn.prepareStatement("SELECT usuario_id FROM empresa_usuario WHERE empresa_id = ?")) {
                    psU.setInt(1, empresaId);
                    try (ResultSet rs = psU.executeQuery()) {
                        while (rs.next()) {
                            try (PreparedStatement psN = conn.prepareStatement(
                                    "INSERT INTO notificacao (usuario_id, canal, titulo, mensagem, lida, data) VALUES (?, 'SISTEMA_EMAIL', ?, ?, 0, ?)")) {
                                psN.setInt(1, rs.getInt("usuario_id"));
                                psN.setString(2, "Status do cadastro da empresa atualizado: " + novoStatus.toUpperCase());
                                psN.setString(3, motivo.isBlank() ? "A Coordenação de Estágio da ETEC Cuiabá atualizou o status da sua empresa para " + novoStatus + "." : "Motivo informado pela Coordenação: " + motivo);
                                psN.setString(4, agora);
                                psN.executeUpdate();
                            }
                        }
                    }
                }

                authService.registrarLog(conn, s.usuarioId(), s.nome(), s.perfil(), "MODERACAO_EMPRESA_" + novoStatus.toUpperCase(),
                        "Empresa #" + empresaId + " -> " + novoStatus + (vagasEncerradas > 0 ? " (" + vagasEncerradas + " vagas retiradas do ar na hora)" : ""), "127.0.0.1");

                conn.commit();
                return Response.ok(Map.of(
                        "sucesso", true,
                        "novoStatus", novoStatus,
                        "vagasRetiradas", vagasEncerradas,
                        "mensagem", "Empresa atualizada para '" + novoStatus + "'" + (vagasEncerradas > 0 ? ". Regra #9 aplicada: " + vagasEncerradas + " vaga(s) saíram do ar imediatamente." : "!")
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
    @Path("/vagas/{id}/moderar")
    public Response moderarVaga(@HeaderParam("Authorization") String authHeader, @PathParam("id") int vagaId, Map<String, Object> body) {
        AuthService.UserSession s = exigirEtec(authHeader);
        if (s == null) return Response.status(Response.Status.FORBIDDEN).build();

        String acao = str(body.get("acao")); // aprovar, pedir_ajuste, recusar, encerrar, destacar
        String motivo = str(body.get("motivo"));
        String hoje = LocalDate.now().toString();
        String agora = LocalDateTime.now().format(DT_FMT);

        try (Connection conn = db.getConnection()) {
            if ("destacar".equalsIgnoreCase(acao)) {
                try (PreparedStatement ps = conn.prepareStatement("UPDATE vaga SET destaque = CASE WHEN destaque = 1 THEN 0 ELSE 1 END WHERE id = ?")) {
                    ps.setInt(1, vagaId);
                    ps.executeUpdate();
                }
                authService.registrarLog(conn, s.usuarioId(), s.nome(), s.perfil(), "ALTERAR_DESTAQUE_VAGA", "Vaga #" + vagaId + " destaque alternado na Home", "127.0.0.1");
                return Response.ok(Map.of("sucesso", true, "mensagem", "Destaque da vaga na página inicial atualizado!")).build();
            }

            String novoStatus = switch (acao.toLowerCase()) {
                case "aprovar", "publicada" -> "publicada";
                case "pedir_ajuste", "ajuste_solicitado" -> "ajuste_solicitado";
                case "encerrar", "encerrada" -> "encerrada";
                default -> "recusada";
            };

            conn.setAutoCommit(false);
            try {
                try (PreparedStatement ps = conn.prepareStatement(
                        "UPDATE vaga SET status = ?, motivo_ajuste = ?, " +
                        "publicado_em = CASE WHEN ? = 'publicada' THEN ? ELSE publicado_em END, " +
                        "aprovado_em = CASE WHEN ? = 'publicada' THEN ? ELSE aprovado_em END, " +
                        "encerrado_em = CASE WHEN ? = 'encerrada' THEN ? ELSE encerrado_em END " +
                        "WHERE id = ?")) {
                    ps.setString(1, novoStatus);
                    ps.setString(2, motivo.isBlank() ? null : motivo);
                    ps.setString(3, novoStatus);
                    ps.setString(4, hoje);
                    ps.setString(5, novoStatus);
                    ps.setString(6, agora);
                    ps.setString(7, novoStatus);
                    ps.setString(8, agora);
                    ps.setInt(9, vagaId);
                    ps.executeUpdate();
                }

                // Busca título e empresa da vaga
                String tituloVaga = "Vaga #" + vagaId;
                int empresaId = 0;
                try (PreparedStatement psV = conn.prepareStatement("SELECT titulo, empresa_id FROM vaga WHERE id = ?")) {
                    psV.setInt(1, vagaId);
                    try (ResultSet rsV = psV.executeQuery()) {
                        if (rsV.next()) {
                            tituloVaga = rsV.getString("titulo");
                            empresaId = rsV.getInt("empresa_id");
                        }
                    }
                }

                // Notifica a empresa sobre a decisão da Coordenação
                try (PreparedStatement psEU = conn.prepareStatement("SELECT usuario_id FROM empresa_usuario WHERE empresa_id = ?")) {
                    psEU.setInt(1, empresaId);
                    try (ResultSet rsEU = psEU.executeQuery()) {
                        while (rsEU.next()) {
                            try (PreparedStatement psN = conn.prepareStatement(
                                    "INSERT INTO notificacao (usuario_id, canal, titulo, mensagem, lida, data) VALUES (?, 'SISTEMA_EMAIL', ?, ?, 0, ?)")) {
                                psN.setInt(1, rsEU.getInt("usuario_id"));
                                psN.setString(2, "Vaga '" + tituloVaga + "': " + novoStatus.toUpperCase().replace("_", " "));
                                psN.setString(3, motivo.isBlank()
                                        ? "A Coordenação de Estágio da ETEC Cuiabá atualizou sua vaga para " + novoStatus + "."
                                        : "Orientação da Coordenação ETEC: " + motivo);
                                psN.setString(4, agora);
                                psN.executeUpdate();
                            }
                        }
                    }
                }

                // Se a vaga foi APROVADA/PUBLICADA, avisa automaticamente os alunos dos cursos vinculados!
                int alunosAvisados = 0;
                if ("publicada".equals(novoStatus)) {
                    try (PreparedStatement psAlu = conn.prepareStatement(
                            "SELECT DISTINCT a.usuario_id, a.alerta_whatsapp FROM aluno a " +
                            "JOIN vaga_curso vc ON vc.curso_id = a.curso_id " +
                            "WHERE vc.vaga_id = ? AND a.modulo >= vc.modulo_minimo AND a.alerta_email = 1")) {
                        psAlu.setInt(1, vagaId);
                        try (ResultSet rsAlu = psAlu.executeQuery()) {
                            while (rsAlu.next()) {
                                String canal = rsAlu.getInt("alerta_whatsapp") == 1 ? "EMAIL_E_WHATSAPP" : "SISTEMA_EMAIL";
                                try (PreparedStatement psN = conn.prepareStatement(
                                        "INSERT INTO notificacao (usuario_id, canal, titulo, mensagem, lida, data) VALUES (?, ?, ?, ?, 0, ?)")) {
                                    psN.setInt(1, rsAlu.getInt("usuario_id"));
                                    psN.setString(2, canal);
                                    psN.setString(3, "Nova vaga aprovada para o seu curso: " + tituloVaga);
                                    psN.setString(4, "A Coordenação de Estágio da ETEC acaba de aprovar uma nova vaga compatível com o seu curso e módulo. Confira e candidate-se com 1 clique!");
                                    psN.setString(5, agora);
                                    psN.executeUpdate();
                                    alunosAvisados++;
                                }
                            }
                        }
                    }
                }

                authService.registrarLog(conn, s.usuarioId(), s.nome(), s.perfil(), "MODERACAO_VAGA_" + novoStatus.toUpperCase(),
                        "Vaga #" + vagaId + " (" + tituloVaga + ") -> " + novoStatus + (alunosAvisados > 0 ? " (" + alunosAvisados + " alunos avisados)" : ""), "127.0.0.1");

                conn.commit();
                return Response.ok(Map.of(
                        "sucesso", true,
                        "novoStatus", novoStatus,
                        "alunosAvisados", alunosAvisados,
                        "mensagem", "Vaga atualizada para '" + novoStatus.replace("_", " ") + "'" + (alunosAvisados > 0 ? " e " + alunosAvisados + " aluno(s) do curso foram notificados!" : "!")
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

    /**
     * Fase 1 MVP + Gestão: Permite que a própria Coordenação da ETEC cadastre e publique
     * diretamente uma vaga recebida por ofício, e-mail ou WhatsApp de empresa parceira.
     */
    @POST
    @Path("/vagas")
    @SuppressWarnings("unchecked")
    public Response cadastrarVagaPelaCoordenacao(@HeaderParam("Authorization") String authHeader, Map<String, Object> body) {
        AuthService.UserSession s = exigirEtec(authHeader);
        if (s == null) return Response.status(Response.Status.FORBIDDEN).build();

        VagaValidator.ValidacaoResultado val = vagaValidator.validarVaga(body);
        if (!val.valido()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("sucesso", false, "erros", val.erros(), "mensagem", String.join(" ", val.erros()))).build();
        }

        int empresaId = intVal(body.get("empresa_id"), 1);
        String hoje = LocalDate.now().toString();
        String agora = LocalDateTime.now().format(DT_FMT);

        try (Connection conn = db.getConnection()) {
            conn.setAutoCommit(false);
            try {
                int vagaId;
                try (PreparedStatement ps = conn.prepareStatement(
                        "INSERT INTO vaga (empresa_id, tipo, titulo, atividades, requisitos, bolsa, beneficios, carga_horaria, horas_dia, horas_semana, turno, modalidade, local, cidade, qtd_vagas, prazo, forma_candidatura, contato_externo, status, confidencial, destaque, criado_em, publicado_em, aprovado_em) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'publicada', ?, ?, ?, ?, ?)",
                        Statement.RETURN_GENERATED_KEYS)) {
                    ps.setInt(1, empresaId);
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
                    ps.setInt(19, Boolean.TRUE.equals(body.get("confidencial")) ? 1 : 0);
                    ps.setInt(20, Boolean.TRUE.equals(body.get("destaque")) ? 1 : 0);
                    ps.setString(21, hoje);
                    ps.setString(22, hoje);
                    ps.setString(23, agora);
                    ps.executeUpdate();
                    try (ResultSet keys = ps.getGeneratedKeys()) {
                        keys.next();
                        vagaId = keys.getInt(1);
                    }
                }

                List<?> cursos = (body.get("cursos") instanceof List<?> l) ? l : List.of();
                int modMin = intVal(body.get("modulo_minimo"), 1);
                try (PreparedStatement psVC = conn.prepareStatement("INSERT OR IGNORE INTO vaga_curso (vaga_id, curso_id, modulo_minimo) VALUES (?, ?, ?)")) {
                    for (Object item : cursos) {
                        int cid = (item instanceof Map<?, ?> m) ? intVal(m.get("cursoId") != null ? m.get("cursoId") : m.get("id"), 0) : intVal(item, 0);
                        if (cid > 0) {
                            psVC.setInt(1, vagaId);
                            psVC.setInt(2, cid);
                            psVC.setInt(3, modMin);
                            psVC.executeUpdate();
                        }
                    }
                }

                authService.registrarLog(conn, s.usuarioId(), s.nome(), s.perfil(), "PUBLICACAO_DIRETA_VAGA_ETEC",
                        "Vaga #" + vagaId + " (" + str(body.get("titulo")) + ") publicada diretamente pela Coordenação", "127.0.0.1");

                conn.commit();
                return Response.ok(Map.of("sucesso", true, "vagaId", vagaId, "mensagem", "Vaga cadastrada e publicada imediatamente no Portal da ETEC Cuiabá!")).build();
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
    @Path("/alunos/{id}/egresso")
    public Response alternarEgresso(@HeaderParam("Authorization") String authHeader, @PathParam("id") int alunoId) {
        AuthService.UserSession s = exigirEtec(authHeader);
        if (s == null) return Response.status(Response.Status.FORBIDDEN).build();

        try (Connection conn = db.getConnection()) {
            try (PreparedStatement ps = conn.prepareStatement(
                    "UPDATE aluno SET egresso = CASE WHEN egresso = 1 THEN 0 ELSE 1 END WHERE id = ?")) {
                ps.setInt(1, alunoId);
                ps.executeUpdate();
            }
            try (PreparedStatement psU = conn.prepareStatement(
                    "UPDATE usuario SET perfil = CASE WHEN (SELECT egresso FROM aluno WHERE id = ?) = 1 THEN 'EGRESSO' ELSE 'ALUNO' END " +
                    "WHERE id = (SELECT usuario_id FROM aluno WHERE id = ?)")) {
                psU.setInt(1, alunoId);
                psU.setInt(2, alunoId);
                psU.executeUpdate();
            }
            authService.registrarLog(conn, s.usuarioId(), s.nome(), s.perfil(), "ATUALIZACAO_STATUS_EGRESSO",
                    "Status de egresso (formado) alternado para Aluno #" + alunoId, "127.0.0.1");
            return Response.ok(Map.of("sucesso", true, "mensagem", "Situação acadêmica (Aluno Ativo / Egresso Formado) atualizada!")).build();
        } catch (Exception e) {
            return Response.serverError().entity(Map.of("sucesso", false, "mensagem", e.getMessage())).build();
        }
    }

    /**
     * Importação da lista de alunos da Secretaria (planilha CSV ou linhas texto: matricula;cpf;nome;email;cursoId;modulo;turno;dataNasc;egresso).
     */
    @POST
    @Path("/alunos/importar")
    public Response importarListaSecretaria(@HeaderParam("Authorization") String authHeader, Map<String, Object> body) {
        AuthService.UserSession s = exigirEtec(authHeader);
        if (s == null) return Response.status(Response.Status.FORBIDDEN).build();

        String csv = str(body.get("csv"));
        if (csv.isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("sucesso", false, "mensagem", "Cole ou selecione as linhas da planilha CSV da Secretaria.")).build();
        }

        int importados = 0;
        try (Connection conn = db.getConnection()) {
            conn.setAutoCommit(false);
            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT OR REPLACE INTO secretaria_base_aluno (matricula, cpf, nome, email_secretaria, curso_id, modulo, turno, data_nasc, egresso, telefone, conta_ativada) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT conta_ativada FROM secretaria_base_aluno WHERE matricula = ?), 0))")) {
                for (String linha : csv.split("\\r?\\n")) {
                    String l = linha.trim();
                    if (l.isEmpty() || l.toLowerCase().startsWith("matricula")) continue;
                    String[] cols = l.contains(";") ? l.split(";") : l.split(",");
                    if (cols.length < 5) continue;

                    String mat = cols[0].trim();
                    String cpf = cols[1].replaceAll("\\D", "");
                    String nome = cols[2].trim();
                    String email = cols[3].trim();
                    int cursoId = intVal(cols[4], 1);
                    int modulo = cols.length > 5 ? intVal(cols[5], 1) : 1;
                    String turno = cols.length > 6 ? cols[6].trim() : "Noite";
                    String dataNasc = cols.length > 7 ? cols[7].trim() : "2006-05-10";
                    int egresso = (cols.length > 8 && ("1".equals(cols[8].trim()) || "sim".equalsIgnoreCase(cols[8].trim()))) ? 1 : 0;
                    String tel = cols.length > 9 ? cols[9].trim() : "(65) 99999-0000";

                    ps.setString(1, mat);
                    ps.setString(2, cpf);
                    ps.setString(3, nome);
                    ps.setString(4, email);
                    ps.setInt(5, cursoId);
                    ps.setInt(6, modulo);
                    ps.setString(7, turno);
                    ps.setString(8, dataNasc);
                    ps.setInt(9, egresso);
                    ps.setString(10, tel);
                    ps.setString(11, mat);
                    ps.executeUpdate();
                    importados++;
                }
                authService.registrarLog(conn, s.usuarioId(), s.nome(), s.perfil(), "IMPORTACAO_PLANILHA_SECRETARia",
                        importados + " registro(s) de alunos importados/atualizados da Secretaria", "127.0.0.1");
                conn.commit();
                return Response.ok(Map.of(
                        "sucesso", true,
                        "importados", importados,
                        "mensagem", importados + " aluno(s) importado(s) da planilha da Secretaria com sucesso! Eles já podem ativar a conta em 'Primeiro acesso do aluno'."
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
    @Path("/estagios/{id}/termo-pdf")
    @Produces("application/pdf")
    public Response baixarTermoCompromissoPdf(@HeaderParam("Authorization") String authHeader, @PathParam("id") int estagioId) {
        AuthService.UserSession s = authService.validarTokenHeader(authHeader);
        if (s == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        try (Connection conn = db.getConnection()) {
            Map<String, Object> dados = carregarDadosCompletosEstagio(conn, estagioId);
            if (dados.isEmpty()) {
                return Response.status(Response.Status.NOT_FOUND).build();
            }
            byte[] pdfBytes = pdfService.gerarTermoCompromissoPdf(dados);
            authService.registrarLog(conn, s.usuarioId(), s.nome(), s.perfil(), "GERACAO_DOWNLOAD_TERMO_ESTAGIO_PDF",
                    "Emitiu Termo de Compromisso de Estágio #" + estagioId + " em PDF (Lei 11.788/2008)", "127.0.0.1");
            return Response.ok(pdfBytes)
                    .header("Content-Disposition", "attachment; filename=\"Termo_Compromisso_Estagio_ETEC_" + estagioId + ".pdf\"")
                    .build();
        } catch (Exception e) {
            e.printStackTrace();
            return Response.serverError().build();
        }
    }

    @PUT
    @Path("/estagios/{id}/atualizar")
    public Response atualizarAssinaturasERelatorioEstagio(@HeaderParam("Authorization") String authHeader, @PathParam("id") int estagioId, Map<String, Object> body) {
        AuthService.UserSession s = exigirEtec(authHeader);
        if (s == null) return Response.status(Response.Status.FORBIDDEN).build();

        boolean assAluno = Boolean.TRUE.equals(body.get("assAluno"));
        boolean assResp = Boolean.TRUE.equals(body.get("assResponsavel"));
        boolean assEmpresa = Boolean.TRUE.equals(body.get("assEmpresa"));
        boolean assEtec = Boolean.TRUE.equals(body.get("assEtec"));
        boolean menorDeIdade = Boolean.TRUE.equals(body.get("menorDeIdade"));

        String relStatus = str(body.get("relatorioSemestralStatus")).isBlank() ? "em_dia" : str(body.get("relatorioSemestralStatus"));
        String situacao = str(body.get("situacao"));

        boolean todasAssinadas = assAluno && assEmpresa && assEtec && (!menorDeIdade || assResp);
        if (situacao.isBlank() || "termo_pendente".equals(situacao)) {
            situacao = todasAssinadas ? "ativo" : "termo_pendente";
        }

        String jsonAss = String.format("{\"aluno\":%b,\"responsavel\":%b,\"empresa\":%b,\"etec\":%b}", assAluno, assResp, assEmpresa, assEtec);

        try (Connection conn = db.getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "UPDATE estagio SET assinaturas = ?, relatorio_semestral_status = ?, situacao = ? WHERE id = ?")) {
            ps.setString(1, jsonAss);
            ps.setString(2, relStatus);
            ps.setString(3, situacao);
            ps.setInt(4, estagioId);
            ps.executeUpdate();

            authService.registrarLog(conn, s.usuarioId(), s.nome(), s.perfil(), "ATUALIZACAO_TERMO_ESTAGIO",
                    "Estágio #" + estagioId + " -> situação: " + situacao + " | assinaturas: " + jsonAss, "127.0.0.1");

            return Response.ok(Map.of(
                    "sucesso", true,
                    "situacao", situacao,
                    "mensagem", "Assinaturas do Termo de Compromisso e situação do estágio atualizadas para '" + situacao + "'!"
            )).build();
        } catch (Exception e) {
            return Response.serverError().entity(Map.of("sucesso", false, "mensagem", e.getMessage())).build();
        }
    }

    @PUT
    @Path("/denuncias/{id}/resolver")
    public Response resolverDenuncia(@HeaderParam("Authorization") String authHeader, @PathParam("id") int denunciaId, Map<String, Object> body) {
        AuthService.UserSession s = exigirEtec(authHeader);
        if (s == null) return Response.status(Response.Status.FORBIDDEN).build();

        String situacao = str(body.get("situacao")); // arquivada, procedente_bloqueada
        String parecer = str(body.get("parecer"));

        try (Connection conn = db.getConnection()) {
            conn.setAutoCommit(false);
            try {
                int vagaId = 0;
                int empresaId = 0;
                try (PreparedStatement psD = conn.prepareStatement(
                        "SELECT d.vaga_id, v.empresa_id FROM denuncia d JOIN vaga v ON v.id = d.vaga_id WHERE d.id = ?")) {
                    psD.setInt(1, denunciaId);
                    try (ResultSet rs = psD.executeQuery()) {
                        if (rs.next()) {
                            vagaId = rs.getInt("vaga_id");
                            empresaId = rs.getInt("empresa_id");
                        }
                    }
                }

                try (PreparedStatement ps = conn.prepareStatement(
                        "UPDATE denuncia SET situacao = ?, parecer_etec = ? WHERE id = ?")) {
                    ps.setString(1, situacao);
                    ps.setString(2, parecer);
                    ps.setInt(3, denunciaId);
                    ps.executeUpdate();
                }

                if ("procedente_bloqueada".equals(situacao) && vagaId > 0) {
                    try (PreparedStatement psV = conn.prepareStatement("UPDATE vaga SET status = 'recusada', motivo_ajuste = ? WHERE id = ?")) {
                        psV.setString(1, "Vaga removida após apuração de denúncia procedente: " + parecer);
                        psV.setInt(2, vagaId);
                        psV.executeUpdate();
                    }
                    if (Boolean.TRUE.equals(body.get("bloquearEmpresa")) && empresaId > 0) {
                        try (PreparedStatement psE = conn.prepareStatement("UPDATE empresa SET status = 'bloqueada', motivo_recusa = ? WHERE id = ?")) {
                            psE.setString(1, "Bloqueada por denúncia procedente: " + parecer);
                            psE.setInt(2, empresaId);
                            psE.executeUpdate();
                        }
                        try (PreparedStatement psAll = conn.prepareStatement("UPDATE vaga SET status = 'encerrada' WHERE empresa_id = ?")) {
                            psAll.setInt(1, empresaId);
                            psAll.executeUpdate();
                        }
                    }
                }

                authService.registrarLog(conn, s.usuarioId(), s.nome(), s.perfil(), "RESOLUCAO_DENUNCIA",
                        "Denúncia #" + denunciaId + " resolvida como: " + situacao, "127.0.0.1");

                conn.commit();
                return Response.ok(Map.of("sucesso", true, "mensagem", "Denúncia atualizada com sucesso!")).build();
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
    @Path("/relatorios/exportar-csv")
    @Produces("text/csv; charset=UTF-8")
    public Response exportarRelatorioCsv(@HeaderParam("Authorization") String authHeader) {
        AuthService.UserSession s = exigirEtec(authHeader);
        if (s == null) return Response.status(Response.Status.FORBIDDEN).build();

        try (Connection conn = db.getConnection()) {
            Map<String, Object> rel = calcularRelatoriosIndicadores(conn);
            StringBuilder sb = new StringBuilder("\uFEFF"); // BOM UTF-8 para abrir com acentos perfeitos no Excel
            sb.append("RELATORIO OFICIAL DE EMPREGABILIDADE E INDICADORES - PORTAL DE VAGAS ETEC CUIABA (SECITECI/MT)\n");
            sb.append("Curso Tecnico;Eixo Tecnologico;Vagas Abertas;Total de Candidaturas;Alunos Contratados (Empregabilidade)\n");

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> porCurso = (List<Map<String, Object>>) rel.get("porCurso");
            for (Map<String, Object> c : porCurso) {
                sb.append(c.get("curso")).append(";")
                  .append(c.get("eixo")).append(";")
                  .append(c.get("vagas")).append(";")
                  .append(c.get("candidaturas")).append(";")
                  .append(c.get("contratados")).append("\n");
            }

            return Response.ok(sb.toString().getBytes(StandardCharsets.UTF_8))
                    .header("Content-Disposition", "attachment; filename=\"Relatorio_Empregabilidade_ETEC_Cuiaba.csv\"")
                    .build();
        } catch (Exception e) {
            return Response.serverError().build();
        }
    }

    @GET
    @Path("/relatorios/exportar-pdf")
    @Produces("application/pdf")
    public Response exportarRelatorioPdf(@HeaderParam("Authorization") String authHeader) {
        AuthService.UserSession s = exigirEtec(authHeader);
        if (s == null) return Response.status(Response.Status.FORBIDDEN).build();

        try (Connection conn = db.getConnection()) {
            Map<String, Object> rel = calcularRelatoriosIndicadores(conn);
            byte[] pdf = pdfService.gerarRelatorioIndicadoresPdf(rel);
            return Response.ok(pdf)
                    .header("Content-Disposition", "attachment; filename=\"Relatorio_Indicadores_SECITECI_ETEC_Cuiaba.pdf\"")
                    .build();
        } catch (Exception e) {
            return Response.serverError().build();
        }
    }

    @POST
    @Path("/admin/backup")
    public Response executarBackupSqlite(@HeaderParam("Authorization") String authHeader) {
        AuthService.UserSession s = exigirEtec(authHeader);
        if (s == null) return Response.status(Response.Status.FORBIDDEN).build();

        String caminho = db.performSafeOnlineBackup();
        if (caminho == null) {
            return Response.serverError().entity(Map.of("sucesso", false, "mensagem", "Falha ao executar backup do SQLite.")).build();
        }
        try (Connection conn = db.getConnection()) {
            authService.registrarLog(conn, s.usuarioId(), s.nome(), s.perfil(), "BACKUP_ONLINE_SQLITE",
                    "Backup seguro gerado via VACUUM INTO: " + caminho, "127.0.0.1");
        } catch (Exception ignored) {}
        return Response.ok(Map.of("sucesso", true, "arquivo", caminho, "mensagem", "Backup seguro do banco SQLite gerado com sucesso via comando nativo VACUUM INTO!")).build();
    }

    @POST
    @Path("/admin/cursos")
    public Response criarOuAtualizarCurso(@HeaderParam("Authorization") String authHeader, Map<String, Object> body) {
        AuthService.UserSession s = exigirEtec(authHeader);
        if (s == null) return Response.status(Response.Status.FORBIDDEN).build();

        String nome = str(body.get("nome"));
        String eixo = str(body.get("eixo"));
        int duracao = intVal(body.get("duracao_modulos"), 3);
        String turno = str(body.get("turno_padrao")).isBlank() ? "Noite" : str(body.get("turno_padrao"));
        String slug = nome.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");

        if (nome.isBlank() || eixo.isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST).entity(Map.of("sucesso", false, "mensagem", "Informe nome e eixo tecnológico do curso.")).build();
        }

        try (Connection conn = db.getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "INSERT INTO curso (nome, slug, eixo, duracao_modulos, turno_padrao, ativo) VALUES (?, ?, ?, ?, ?, 1)")) {
            ps.setString(1, nome);
            ps.setString(2, slug);
            ps.setString(3, eixo);
            ps.setInt(4, duracao);
            ps.setString(5, turno);
            ps.executeUpdate();
            authService.registrarLog(conn, s.usuarioId(), s.nome(), s.perfil(), "CADASTRO_CURSO_TECNICO", "Novo curso: " + nome, "127.0.0.1");
            return Response.ok(Map.of("sucesso", true, "mensagem", "Curso técnico cadastrado com sucesso!")).build();
        } catch (Exception e) {
            return Response.serverError().entity(Map.of("sucesso", false, "mensagem", e.getMessage())).build();
        }
    }

    private List<Map<String, Object>> listarEmpresas(Connection conn) throws Exception {
        List<Map<String, Object>> lista = new ArrayList<>();
        String sql = "SELECT e.*, " +
                     "(SELECT COUNT(*) FROM vaga v WHERE v.empresa_id = e.id) as total_vagas, " +
                     "(SELECT COUNT(*) FROM denuncia d JOIN vaga v ON v.id = d.vaga_id WHERE v.empresa_id = e.id) as total_denuncias " +
                     "FROM empresa e ORDER BY CASE e.status WHEN 'pendente' THEN 0 WHEN 'aprovada' THEN 1 ELSE 2 END, e.id DESC";
        try (PreparedStatement ps = conn.prepareStatement(sql); ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
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
                m.put("totalVagas", rs.getInt("total_vagas"));
                m.put("totalDenuncias", rs.getInt("total_denuncias"));
                lista.add(m);
            }
        }
        return lista;
    }

    private List<Map<String, Object>> listarTodasVagas(Connection conn) throws Exception {
        List<Map<String, Object>> lista = new ArrayList<>();
        // A ETEC sempre vê o nome real da empresa mesmo se confidencial = 1!
        String sql = "SELECT v.*, e.nome_fantasia as empresa_real_nome, e.cnpj as empresa_cnpj, e.status as empresa_status, " +
                     "(SELECT COUNT(*) FROM candidatura c WHERE c.vaga_id = v.id) as total_candidatos " +
                     "FROM vaga v JOIN empresa e ON e.id = v.empresa_id " +
                     "ORDER BY CASE v.status WHEN 'aguardando_aprovacao' THEN 0 WHEN 'publicada' THEN 1 ELSE 2 END, v.id DESC";
        try (PreparedStatement ps = conn.prepareStatement(sql); ResultSet rs = ps.executeQuery()) {
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
                m.put("empresaId", rs.getInt("empresa_id"));
                m.put("empresaRealNome", rs.getString("empresa_real_nome"));
                m.put("empresaCnpj", rs.getString("empresa_cnpj"));
                m.put("empresaStatus", rs.getString("empresa_status"));
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
        return lista;
    }

    private List<Map<String, Object>> listarAlunos(Connection conn) throws Exception {
        List<Map<String, Object>> lista = new ArrayList<>();
        String sql = "SELECT a.*, u.nome, u.email, u.cpf, c.nome as curso_nome, " +
                     "(SELECT COUNT(*) FROM candidatura ca WHERE ca.aluno_id = a.id) as total_candidaturas " +
                     "FROM aluno a JOIN usuario u ON u.id = a.usuario_id JOIN curso c ON c.id = a.curso_id ORDER BY a.id DESC";
        try (PreparedStatement ps = conn.prepareStatement(sql); ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                int idade = 18;
                try {
                    idade = Period.between(LocalDate.parse(rs.getString("data_nasc")), LocalDate.now()).getYears();
                } catch (Exception ignored) {}
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", rs.getInt("id"));
                m.put("nome", rs.getString("nome"));
                m.put("email", rs.getString("email"));
                m.put("cpf", rs.getString("cpf"));
                m.put("matricula", rs.getString("matricula"));
                m.put("cursoNome", rs.getString("curso_nome"));
                m.put("modulo", rs.getInt("modulo"));
                m.put("turno", rs.getString("turno"));
                m.put("dataNasc", rs.getString("data_nasc"));
                m.put("idade", idade);
                m.put("menorDeIdade", idade < 18);
                m.put("egresso", rs.getInt("egresso") == 1);
                m.put("telefone", rs.getString("telefone"));
                m.put("totalCandidaturas", rs.getInt("total_candidaturas"));
                lista.add(m);
            }
        }
        return lista;
    }

    private List<Map<String, Object>> listarBaseSecretaria(Connection conn) throws Exception {
        List<Map<String, Object>> lista = new ArrayList<>();
        String sql = "SELECT s.*, c.nome as curso_nome FROM secretaria_base_aluno s JOIN curso c ON c.id = s.curso_id ORDER BY s.conta_ativada ASC, s.id DESC";
        try (PreparedStatement ps = conn.prepareStatement(sql); ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("matricula", rs.getString("matricula"));
                m.put("cpf", rs.getString("cpf"));
                m.put("nome", rs.getString("nome"));
                m.put("emailSecretaria", rs.getString("email_secretaria"));
                m.put("cursoNome", rs.getString("curso_nome"));
                m.put("modulo", rs.getInt("modulo"));
                m.put("turno", rs.getString("turno"));
                m.put("egresso", rs.getInt("egresso") == 1);
                m.put("contaAtivada", rs.getInt("conta_ativada") == 1);
                lista.add(m);
            }
        }
        return lista;
    }

    private List<Map<String, Object>> listarEstagios(Connection conn) throws Exception {
        List<Map<String, Object>> lista = new ArrayList<>();
        String sql = "SELECT es.*, u.nome as aluno_nome, a.matricula, a.data_nasc, a.modulo, a.turno, a.responsavel_nome, " +
                     "cu.nome as curso_nome, v.titulo as vaga_titulo, v.carga_horaria, v.bolsa, e.nome_fantasia as empresa_nome, e.cnpj as empresa_cnpj " +
                     "FROM estagio es " +
                     "JOIN candidatura c ON c.id = es.candidatura_id " +
                     "JOIN aluno a ON a.id = c.aluno_id " +
                     "JOIN usuario u ON u.id = a.usuario_id " +
                     "JOIN curso cu ON cu.id = a.curso_id " +
                     "JOIN vaga v ON v.id = c.vaga_id " +
                     "JOIN empresa e ON e.id = v.empresa_id " +
                     "ORDER BY es.id DESC";
        try (PreparedStatement ps = conn.prepareStatement(sql); ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                int idade = 18;
                try {
                    idade = Period.between(LocalDate.parse(rs.getString("data_nasc")), LocalDate.now()).getYears();
                } catch (Exception ignored) {}
                String ass = rs.getString("assinaturas") != null ? rs.getString("assinaturas") : "{}";

                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", rs.getInt("id"));
                m.put("candidaturaId", rs.getInt("candidatura_id"));
                m.put("alunoNome", rs.getString("aluno_nome"));
                m.put("matricula", rs.getString("matricula"));
                m.put("idade", idade);
                m.put("menorDeIdade", idade < 18);
                m.put("responsavelNome", rs.getString("responsavel_nome"));
                m.put("cursoNome", rs.getString("curso_nome"));
                m.put("modulo", rs.getInt("modulo"));
                m.put("turno", rs.getString("turno"));
                m.put("vagaTitulo", rs.getString("vaga_titulo"));
                m.put("cargaHoraria", rs.getString("carga_horaria"));
                m.put("bolsa", rs.getString("bolsa"));
                m.put("empresaNome", rs.getString("empresa_nome"));
                m.put("empresaCnpj", rs.getString("empresa_cnpj"));
                m.put("dataInicio", rs.getString("data_inicio"));
                m.put("dataFim", rs.getString("data_fim"));
                m.put("supervisorNome", rs.getString("supervisor_nome"));
                m.put("assinaturas", ass);
                m.put("assAluno", ass.contains("\"aluno\":true"));
                m.put("assResponsavel", ass.contains("\"responsavel\":true"));
                m.put("assEmpresa", ass.contains("\"empresa\":true"));
                m.put("assEtec", ass.contains("\"etec\":true"));
                m.put("relatorioSemestralData", rs.getString("relatorio_semestral_data"));
                m.put("relatorioSemestralStatus", rs.getString("relatorio_semestral_status"));
                m.put("situacao", rs.getString("situacao"));
                lista.add(m);
            }
        }
        return lista;
    }

    private Map<String, Object> carregarDadosCompletosEstagio(Connection conn, int estagioId) throws Exception {
        String sql = "SELECT es.*, u.nome as aluno_nome, u.cpf as aluno_cpf, a.matricula as aluno_matricula, a.data_nasc as aluno_data_nasc, " +
                     "a.modulo as aluno_modulo, a.turno as aluno_turno, a.responsavel_nome, a.responsavel_cpf, " +
                     "cu.nome as curso_nome, v.titulo as vaga_titulo, v.tipo as vaga_tipo, v.carga_horaria, v.turno as vaga_turno, v.bolsa, v.beneficios, " +
                     "e.razao_social as empresa_razao, e.nome_fantasia as empresa_nome, e.cnpj as empresa_cnpj, e.endereco as empresa_endereco, e.cidade as empresa_cidade " +
                     "FROM estagio es " +
                     "JOIN candidatura c ON c.id = es.candidatura_id " +
                     "JOIN aluno a ON a.id = c.aluno_id " +
                     "JOIN usuario u ON u.id = a.usuario_id " +
                     "JOIN curso cu ON cu.id = a.curso_id " +
                     "JOIN vaga v ON v.id = c.vaga_id " +
                     "JOIN empresa e ON e.id = v.empresa_id " +
                     "WHERE es.id = ?";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, estagioId);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) return Map.of();
                String ass = rs.getString("assinaturas") != null ? rs.getString("assinaturas") : "{}";
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", rs.getInt("id"));
                m.put("aluno_nome", rs.getString("aluno_nome"));
                m.put("aluno_cpf", rs.getString("aluno_cpf"));
                m.put("aluno_matricula", rs.getString("aluno_matricula"));
                m.put("aluno_data_nasc", rs.getString("aluno_data_nasc"));
                m.put("aluno_modulo", rs.getInt("aluno_modulo"));
                m.put("aluno_turno", rs.getString("aluno_turno"));
                m.put("responsavel_nome", rs.getString("responsavel_nome"));
                m.put("responsavel_cpf", rs.getString("responsavel_cpf"));
                m.put("curso_nome", rs.getString("curso_nome"));
                m.put("vaga_titulo", rs.getString("vaga_titulo"));
                m.put("vaga_tipo", rs.getString("vaga_tipo"));
                m.put("carga_horaria", rs.getString("carga_horaria"));
                m.put("vaga_turno", rs.getString("vaga_turno"));
                m.put("bolsa", rs.getString("bolsa"));
                m.put("beneficios", rs.getString("beneficios"));
                m.put("empresa_razao", rs.getString("empresa_razao"));
                m.put("empresa_nome", rs.getString("empresa_nome"));
                m.put("empresa_cnpj", rs.getString("empresa_cnpj"));
                m.put("empresa_endereco", rs.getString("empresa_endereco"));
                m.put("empresa_cidade", rs.getString("empresa_cidade"));
                m.put("data_inicio", rs.getString("data_inicio"));
                m.put("data_fim", rs.getString("data_fim"));
                m.put("supervisor_nome", rs.getString("supervisor_nome"));
                m.put("supervisor_cargo", rs.getString("supervisor_cargo"));
                m.put("relatorio_semestral_data", rs.getString("relatorio_semestral_data"));
                m.put("ass_aluno", ass.contains("\"aluno\":true"));
                m.put("ass_responsavel", ass.contains("\"responsavel\":true"));
                m.put("ass_empresa", ass.contains("\"empresa\":true"));
                m.put("ass_etec", ass.contains("\"etec\":true"));
                return m;
            }
        }
    }

    private List<Map<String, Object>> listarDenuncias(Connection conn) throws Exception {
        List<Map<String, Object>> lista = new ArrayList<>();
        String sql = "SELECT d.*, v.titulo as vaga_titulo, e.nome_fantasia as empresa_nome, e.id as empresa_id " +
                     "FROM denuncia d JOIN vaga v ON v.id = d.vaga_id JOIN empresa e ON e.id = v.empresa_id ORDER BY d.id DESC";
        try (PreparedStatement ps = conn.prepareStatement(sql); ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", rs.getInt("id"));
                m.put("vagaId", rs.getInt("vaga_id"));
                m.put("vagaTitulo", rs.getString("vaga_titulo"));
                m.put("empresaId", rs.getInt("empresa_id"));
                m.put("empresaNome", rs.getString("empresa_nome"));
                m.put("motivo", rs.getString("motivo"));
                m.put("descricao", rs.getString("descricao"));
                m.put("denuncianteNome", rs.getString("denunciante_nome"));
                m.put("denuncianteContato", rs.getString("denunciante_contato"));
                m.put("situacao", rs.getString("situacao"));
                m.put("parecerEtec", rs.getString("parecer_etec"));
                m.put("data", rs.getString("data"));
                lista.add(m);
            }
        }
        return lista;
    }

    private Map<String, Object> calcularRelatoriosIndicadores(Connection conn) throws Exception {
        Map<String, Object> resumo = new LinkedHashMap<>();
        int vagasPublicadas = scalarInt(conn, "SELECT COUNT(*) FROM vaga WHERE status IN ('publicada', 'encerrada')");
        int vagasAbertas = scalarInt(conn, "SELECT COUNT(*) FROM vaga WHERE status = 'publicada'");
        int totalCandidaturas = scalarInt(conn, "SELECT COUNT(*) FROM candidatura");
        int alunosContratados = scalarInt(conn, "SELECT COUNT(*) FROM candidatura WHERE contratado = 1 OR status = 'aprovado'");
        int vagasPreenchidas = scalarInt(conn, "SELECT COUNT(DISTINCT vaga_id) FROM candidatura WHERE contratado = 1 OR status = 'aprovado'");
        int empresasAtivas = scalarInt(conn, "SELECT COUNT(*) FROM empresa WHERE status = 'aprovada'");
        int estagiosAtivos = scalarInt(conn, "SELECT COUNT(*) FROM estagio WHERE situacao = 'ativo'");
        int termosPendentes = scalarInt(conn, "SELECT COUNT(*) FROM estagio WHERE situacao = 'termo_pendente'");
        int totalDenuncias = scalarInt(conn, "SELECT COUNT(*) FROM denuncia");

        int taxaPreenchimento = vagasPublicadas > 0 ? Math.round((vagasPreenchidas * 100.0f) / vagasPublicadas) : 0;

        resumo.put("vagasPublicadas", vagasPublicadas);
        resumo.put("vagasAbertas", vagasAbertas);
        resumo.put("totalCandidaturas", totalCandidaturas);
        resumo.put("alunosContratados", alunosContratados);
        resumo.put("taxaPreenchimento", taxaPreenchimento);
        resumo.put("tempoMedioAprovacaoHoras", 14);
        resumo.put("empresasAtivas", empresasAtivas);
        resumo.put("estagiosAtivos", estagiosAtivos);
        resumo.put("termosPendentes", termosPendentes);
        resumo.put("totalDenuncias", totalDenuncias);

        List<Map<String, Object>> porCurso = new ArrayList<>();
        String sqlCurso = "SELECT c.nome, c.eixo, " +
                          "(SELECT COUNT(DISTINCT vc.vaga_id) FROM vaga_curso vc JOIN vaga v ON v.id = vc.vaga_id WHERE vc.curso_id = c.id AND v.status = 'publicada') as vagas, " +
                          "(SELECT COUNT(*) FROM candidatura ca JOIN aluno a ON a.id = ca.aluno_id WHERE a.curso_id = c.id) as candidaturas, " +
                          "(SELECT COUNT(*) FROM candidatura ca JOIN aluno a ON a.id = ca.aluno_id WHERE a.curso_id = c.id AND (ca.contratado = 1 OR ca.status = 'aprovado')) as contratados " +
                          "FROM curso c ORDER BY contratados DESC, vagas DESC";
        try (PreparedStatement ps = conn.prepareStatement(sqlCurso); ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("curso", rs.getString("nome"));
                m.put("eixo", rs.getString("eixo"));
                m.put("vagas", rs.getInt("vagas"));
                m.put("candidaturas", rs.getInt("candidaturas"));
                m.put("contratados", rs.getInt("contratados"));
                porCurso.add(m);
            }
        }

        List<Map<String, Object>> porTipo = new ArrayList<>();
        String sqlTipo = "SELECT tipo, COUNT(*) as total, " +
                         "(SELECT COUNT(*) FROM candidatura ca JOIN vaga v2 ON v2.id = ca.vaga_id WHERE v2.tipo = v.tipo AND (ca.contratado = 1 OR ca.status = 'aprovado')) as contratados " +
                         "FROM vaga v GROUP BY tipo";
        try (PreparedStatement ps = conn.prepareStatement(sqlTipo); ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                porTipo.add(Map.of(
                        "tipo", rs.getString("tipo"),
                        "totalVagas", rs.getInt("total"),
                        "contratados", rs.getInt("contratados")
                ));
            }
        }

        Map<String, Object> rel = new LinkedHashMap<>();
        rel.put("resumo", resumo);
        rel.put("porCurso", porCurso);
        rel.put("porTipo", porTipo);
        return rel;
    }

    private List<Map<String, Object>> listarLogsAuditoria(Connection conn) throws Exception {
        List<Map<String, Object>> lista = new ArrayList<>();
        try (PreparedStatement ps = conn.prepareStatement("SELECT * FROM log_auditoria ORDER BY id DESC LIMIT 80");
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", rs.getInt("id"));
                m.put("usuarioId", rs.getObject("usuario_id"));
                m.put("usuarioNome", rs.getString("usuario_nome"));
                m.put("perfil", rs.getString("perfil"));
                m.put("acao", rs.getString("acao"));
                m.put("alvo", rs.getString("alvo"));
                m.put("data", rs.getString("data"));
                m.put("ip", rs.getString("ip"));
                lista.add(m);
            }
        }
        return lista;
    }

    private List<Map<String, Object>> listarUsuariosSistema(Connection conn) throws Exception {
        List<Map<String, Object>> lista = new ArrayList<>();
        try (PreparedStatement ps = conn.prepareStatement("SELECT id, login, email, cpf, nome, perfil, ativo, ultimo_acesso FROM usuario ORDER BY id ASC");
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", rs.getInt("id"));
                m.put("login", rs.getString("login"));
                m.put("email", rs.getString("email"));
                m.put("cpf", rs.getString("cpf"));
                m.put("nome", rs.getString("nome"));
                m.put("perfil", rs.getString("perfil"));
                m.put("ativo", rs.getInt("ativo") == 1);
                m.put("ultimoAcesso", rs.getString("ultimo_acesso"));
                lista.add(m);
            }
        }
        return lista;
    }

    private List<Map<String, Object>> listarConfiguracoes(Connection conn) throws Exception {
        List<Map<String, Object>> lista = new ArrayList<>();
        try (PreparedStatement ps = conn.prepareStatement("SELECT * FROM configuracao");
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                lista.add(Map.of(
                        "chave", rs.getString("chave"),
                        "valor", rs.getString("valor"),
                        "descricao", rs.getString("descricao")
                ));
            }
        }
        return lista;
    }

    private int scalarInt(Connection conn, String sql) throws Exception {
        try (PreparedStatement ps = conn.prepareStatement(sql); ResultSet rs = ps.executeQuery()) {
            return rs.next() ? rs.getInt(1) : 0;
        }
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
