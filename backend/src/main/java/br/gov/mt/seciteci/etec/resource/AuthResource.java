package br.gov.mt.seciteci.etec.resource;

import br.gov.mt.seciteci.etec.config.DatabaseManager;
import br.gov.mt.seciteci.etec.service.AuthService;
import io.quarkus.elytron.security.common.BcryptUtil;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;

@Path("/api/auth")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class AuthResource {

    @Inject
    AuthService authService;

    @Inject
    DatabaseManager db;

    private static final DateTimeFormatter DT_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @GET
    @Path("/identificar")
    public Response identificar(@QueryParam("valor") String valor) {
        String tipo = authService.identificarTipoEntrada(valor);
        String dica = switch (tipo) {
            case "EMAIL" -> "Entrando como aluno (e-mail)";
            case "CPF" -> "Entrando como aluno (CPF)";
            default -> "Entrando como empresa";
        };
        return Response.ok(Map.of("tipo", tipo, "dica", dica)).build();
    }

    @POST
    @Path("/login")
    public Response login(Map<String, Object> body, @HeaderParam("X-Forwarded-For") String ip) {
        String identificador = body != null && body.get("identificador") != null ? body.get("identificador").toString() : "";
        String senha = body != null && body.get("senha") != null ? body.get("senha").toString() : "";
        Map<String, Object> res = authService.autenticar(identificador, senha, ip != null ? ip : "127.0.0.1");
        if (Boolean.TRUE.equals(res.get("sucesso"))) {
            return Response.ok(res).build();
        }
        return Response.status(Response.Status.UNAUTHORIZED).entity(res).build();
    }

    @GET
    @Path("/me")
    public Response me(@HeaderParam("Authorization") String authHeader) {
        AuthService.UserSession session = authService.validarTokenHeader(authHeader);
        if (session == null) {
            return Response.status(Response.Status.UNAUTHORIZED).entity(Map.of("mensagem", "Sessão expirada ou inválida")).build();
        }
        return Response.ok(session).build();
    }

    @POST
    @Path("/recuperar-senha")
    public Response recuperarSenha(Map<String, Object> body) {
        String identificador = body != null && body.get("identificador") != null ? body.get("identificador").toString().trim() : "";
        String cpfDigits = identificador.replaceAll("\\D", "");
        String emailMascarado = "jo***@gmail.com";

        try (Connection conn = db.getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "SELECT email FROM usuario WHERE lower(email) = lower(?) OR lower(login) = lower(?) OR (cpf IS NOT NULL AND cpf = ?)")) {
            ps.setString(1, identificador);
            ps.setString(2, identificador);
            ps.setString(3, cpfDigits.isEmpty() ? "__NONE__" : cpfDigits);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next() && rs.getString("email") != null) {
                    emailMascarado = authService.mascararEmail(rs.getString("email"));
                }
            }
        } catch (Exception ignored) {}

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("sucesso", true);
        resp.put("emailMascarado", emailMascarado);
        resp.put("mensagem", "Enviamos as instruções de recuperação de senha para o e-mail cadastrado: " + emailMascarado);
        return Response.ok(resp).build();
    }

    @POST
    @Path("/primeiro-acesso/conferir")
    public Response conferirPrimeiroAcesso(Map<String, Object> body) {
        String cpf = body != null && body.get("cpf") != null ? body.get("cpf").toString().replaceAll("\\D", "") : "";
        String matricula = body != null && body.get("matricula") != null ? body.get("matricula").toString().trim() : "";

        if (cpf.length() != 11 || matricula.isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("sucesso", false, "mensagem", "Informe um CPF válido (11 dígitos) e o número da matrícula.")).build();
        }

        try (Connection conn = db.getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "SELECT s.*, c.nome as curso_nome FROM secretaria_base_aluno s JOIN curso c ON c.id = s.curso_id WHERE s.cpf = ? AND s.matricula = ?")) {
            ps.setString(1, cpf);
            ps.setString(2, matricula);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) {
                    return Response.status(Response.Status.NOT_FOUND)
                            .entity(Map.of("sucesso", false, "mensagem", "Matrícula e CPF não localizados na base ativa da Secretaria da ETEC Cuiabá.")).build();
                }
                if (rs.getInt("conta_ativada") == 1) {
                    return Response.status(Response.Status.CONFLICT)
                            .entity(Map.of("sucesso", false, "mensagem", "Este aluno já realizou o primeiro acesso. Utilize a tela de login ou 'Esqueci minha senha'.")).build();
                }
                String emailSec = rs.getString("email_secretaria");
                Map<String, Object> resp = new LinkedHashMap<>();
                resp.put("sucesso", true);
                resp.put("nome", rs.getString("nome"));
                resp.put("cursoNome", rs.getString("curso_nome"));
                resp.put("modulo", rs.getInt("modulo"));
                resp.put("turno", rs.getString("turno"));
                resp.put("emailMascarado", authService.mascararEmail(emailSec));
                resp.put("mensagem", "Matrícula confirmada na Secretaria! Um link de verificação foi enviado para " + authService.mascararEmail(emailSec) + ". Defina sua senha abaixo.");
                return Response.ok(resp).build();
            }
        } catch (Exception e) {
            return Response.serverError().entity(Map.of("sucesso", false, "mensagem", "Erro ao consultar base da secretaria.")).build();
        }
    }

    @POST
    @Path("/primeiro-acesso/ativar")
    public Response ativarPrimeiroAcesso(Map<String, Object> body) {
        String cpf = body != null && body.get("cpf") != null ? body.get("cpf").toString().replaceAll("\\D", "") : "";
        String matricula = body != null && body.get("matricula") != null ? body.get("matricula").toString().trim() : "";
        String senha = body != null && body.get("senha") != null ? body.get("senha").toString() : "";

        if (cpf.length() != 11 || matricula.isBlank() || senha.length() < 6) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("sucesso", false, "mensagem", "A senha deve ter pelo menos 6 caracteres.")).build();
        }

        try (Connection conn = db.getConnection()) {
            conn.setAutoCommit(false);
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT * FROM secretaria_base_aluno WHERE cpf = ? AND matricula = ? AND conta_ativada = 0")) {
                ps.setString(1, cpf);
                ps.setString(2, matricula);
                try (ResultSet rs = ps.executeQuery()) {
                    if (!rs.next()) {
                        conn.rollback();
                        return Response.status(Response.Status.BAD_REQUEST)
                                .entity(Map.of("sucesso", false, "mensagem", "Registro não encontrado ou conta já ativada.")).build();
                    }

                    String nome = rs.getString("nome");
                    String email = rs.getString("email_secretaria");
                    int cursoId = rs.getInt("curso_id");
                    int modulo = rs.getInt("modulo");
                    String turno = rs.getString("turno");
                    String dataNasc = rs.getString("data_nasc");
                    int egresso = rs.getInt("egresso");
                    String telefone = rs.getString("telefone");
                    String perfil = egresso == 1 ? "EGRESSO" : "ALUNO";
                    String agora = LocalDateTime.now().format(DT_FMT);

                    int novoUserId;
                    try (PreparedStatement psU = conn.prepareStatement(
                            "INSERT INTO usuario (login, email, cpf, nome, senha_hash, perfil, ativo, ultimo_acesso) VALUES (?, ?, ?, ?, ?, ?, 1, ?)",
                            Statement.RETURN_GENERATED_KEYS)) {
                        psU.setString(1, "aluno." + matricula);
                        psU.setString(2, email);
                        psU.setString(3, cpf);
                        psU.setString(4, nome);
                        psU.setString(5, BcryptUtil.bcryptHash(senha));
                        psU.setString(6, perfil);
                        psU.setString(7, agora);
                        psU.executeUpdate();
                        try (ResultSet keys = psU.getGeneratedKeys()) {
                            keys.next();
                            novoUserId = keys.getInt(1);
                        }
                    }

                    int novoAlunoId;
                    try (PreparedStatement psA = conn.prepareStatement(
                            "INSERT INTO aluno (usuario_id, matricula, curso_id, modulo, turno, data_nasc, egresso, telefone, consentimento_lgpd, consentimento_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)",
                            Statement.RETURN_GENERATED_KEYS)) {
                        psA.setInt(1, novoUserId);
                        psA.setString(2, matricula);
                        psA.setInt(3, cursoId);
                        psA.setInt(4, modulo);
                        psA.setString(5, turno);
                        psA.setString(6, dataNasc);
                        psA.setInt(7, egresso);
                        psA.setString(8, telefone);
                        psA.setString(9, agora);
                        psA.executeUpdate();
                        try (ResultSet keys = psA.getGeneratedKeys()) {
                            keys.next();
                            novoAlunoId = keys.getInt(1);
                        }
                    }

                    try (PreparedStatement psC = conn.prepareStatement(
                            "INSERT INTO curriculo (aluno_id, resumo, formacao, habilidades, links, atualizado_em) VALUES (?, ?, ?, ?, '{}', ?)")) {
                        psC.setInt(1, novoAlunoId);
                        psC.setString(2, "Estudante regularmente matriculado na ETEC Cuiabá (Matrícula " + matricula + ").");
                        psC.setString(3, "Curso Técnico na ETEC Cuiabá — " + modulo + "º módulo (" + turno + ").");
                        psC.setString(4, "Trabalho em equipe, proatividade, formação técnica ETEC Cuiabá");
                        psC.setString(5, agora);
                        psC.executeUpdate();
                    }

                    try (PreparedStatement psUp = conn.prepareStatement(
                            "UPDATE secretaria_base_aluno SET conta_ativada = 1 WHERE matricula = ?")) {
                        psUp.setString(1, matricula);
                        psUp.executeUpdate();
                    }

                    authService.registrarLog(conn, novoUserId, nome, perfil, "PRIMEIRO_ACESSO_ALUNO_ATIVADO",
                            "Matrícula " + matricula + " ativada com sucesso", "127.0.0.1");
                    conn.commit();
                }
            }
            return Response.ok(authService.autenticar(cpf, senha, "127.0.0.1")).build();
        } catch (Exception e) {
            e.printStackTrace();
            return Response.serverError().entity(Map.of("sucesso", false, "mensagem", "Não foi possível ativar a conta: " + e.getMessage())).build();
        }
    }
}
