package br.gov.mt.seciteci.etec.service;

import br.gov.mt.seciteci.etec.config.DatabaseManager;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.elytron.security.common.BcryptUtil;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Optional;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

@ApplicationScoped
public class AuthService {

    private static final DateTimeFormatter DT_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    /**
     * Chave HMAC dos tokens. Em produção defina a variável de ambiente ETEC_JWT_SECRET (mín. 32 caracteres).
     * Sem ela, gera uma chave aleatória a cada inicialização (as sessões caem ao reiniciar o servidor).
     */
    @ConfigProperty(name = "etec.jwt.secret")
    Optional<String> jwtSecretConfig;

    private byte[] jwtSecret;

    @PostConstruct
    void initJwtSecret() {
        String s = jwtSecretConfig.map(String::trim).orElse("");
        if (s.length() >= 32) {
            jwtSecret = s.getBytes(StandardCharsets.UTF_8);
        } else {
            jwtSecret = new byte[32];
            new SecureRandom().nextBytes(jwtSecret);
            System.out.println("[ETEC Portal de Vagas] ETEC_JWT_SECRET não definida: usando chave aleatória temporária.");
        }
    }

    @Inject
    DatabaseManager db;

    private final ObjectMapper mapper = new ObjectMapper();

    public record UserSession(
            int usuarioId,
            String nome,
            String email,
            String perfil,
            Integer alunoId,
            Integer empresaId,
            long expEpochSeconds
    ) {}

    public String identificarTipoEntrada(String identificador) {
        if (identificador == null) return "DESCONHECIDO";
        String clean = identificador.trim();
        if (clean.contains("@")) {
            return "EMAIL";
        }
        String onlyDigits = clean.replaceAll("\\D", "");
        if (onlyDigits.length() == 11 && clean.matches("[0-9.\\-]+")) {
            return "CPF";
        }
        return "LOGIN_EMPRESA";
    }

    public String mascararEmail(String email) {
        if (email == null || !email.contains("@")) return "u***@etec.mt.gov.br";
        String[] parts = email.split("@", 2);
        String user = parts[0];
        String prefix = user.length() >= 2 ? user.substring(0, 2) : user.substring(0, 1);
        return prefix + "***@" + parts[1];
    }

    public String gerarTokenJwt(UserSession session) {
        try {
            String headerJson = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("sub", String.valueOf(session.usuarioId()));
            payload.put("usuarioId", session.usuarioId());
            payload.put("nome", session.nome());
            payload.put("email", session.email());
            payload.put("perfil", session.perfil());
            payload.put("alunoId", session.alunoId());
            payload.put("empresaId", session.empresaId());
            payload.put("exp", session.expEpochSeconds());

            String payloadJson = mapper.writeValueAsString(payload);
            String b64Header = Base64.getUrlEncoder().withoutPadding().encodeToString(headerJson.getBytes(StandardCharsets.UTF_8));
            String b64Payload = Base64.getUrlEncoder().withoutPadding().encodeToString(payloadJson.getBytes(StandardCharsets.UTF_8));
            String signingInput = b64Header + "." + b64Payload;
            String signature = signHmacSha256(signingInput);
            return signingInput + "." + signature;
        } catch (Exception e) {
            throw new RuntimeException("Erro ao gerar token JWT", e);
        }
    }

    public UserSession validarTokenHeader(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return null;
        }
        String token = authHeader.substring(7).trim();
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3) return null;
            String expectedSig = signHmacSha256(parts[0] + "." + parts[1]);
            if (!expectedSig.equals(parts[2])) return null;

            String payloadJson = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
            @SuppressWarnings("unchecked")
            Map<String, Object> map = mapper.readValue(payloadJson, Map.class);
            long exp = ((Number) map.get("exp")).longValue();
            if (Instant.now().getEpochSecond() > exp) {
                return null;
            }
            int usuarioId = ((Number) map.get("usuarioId")).intValue();
            String nome = (String) map.get("nome");
            String email = (String) map.get("email");
            String perfil = (String) map.get("perfil");
            Integer alunoId = map.get("alunoId") != null ? ((Number) map.get("alunoId")).intValue() : null;
            Integer empresaId = map.get("empresaId") != null ? ((Number) map.get("empresaId")).intValue() : null;
            return new UserSession(usuarioId, nome, email, perfil, alunoId, empresaId, exp);
        } catch (Exception e) {
            return null;
        }
    }

    private String signHmacSha256(String data) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(jwtSecret, "HmacSHA256"));
        byte[] raw = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        return Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
    }

    public Map<String, Object> autenticar(String identificadorRaw, String senha, String ip) {
        Map<String, Object> resp = new HashMap<>();
        if (identificadorRaw == null || senha == null || identificadorRaw.isBlank() || senha.isBlank()) {
            resp.put("sucesso", false);
            resp.put("mensagem", "Login ou senha incorretos");
            return resp;
        }

        String trimmed = identificadorRaw.trim();
        String tipo = identificarTipoEntrada(trimmed);
        String cpfDigits = trimmed.replaceAll("\\D", "");

        try (Connection conn = db.getConnection()) {
            String sql = "SELECT id, login, email, cpf, nome, senha_hash, perfil, ativo, tentativas_falhas, bloqueado_ate " +
                         "FROM usuario WHERE lower(email) = lower(?) OR lower(login) = lower(?) OR (cpf IS NOT NULL AND cpf = ?)";
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setString(1, trimmed);
                ps.setString(2, trimmed);
                ps.setString(3, cpfDigits.isEmpty() ? "__NONE__" : cpfDigits);

                try (ResultSet rs = ps.executeQuery()) {
                    if (!rs.next()) {
                        // Regra de segurança: Erro sempre genérico! Nunca "CPF não cadastrado".
                        resp.put("sucesso", false);
                        resp.put("mensagem", "Login ou senha incorretos");
                        return resp;
                    }

                    int userId = rs.getInt("id");
                    String nome = rs.getString("nome");
                    String email = rs.getString("email");
                    String senhaHash = rs.getString("senha_hash");
                    String perfil = rs.getString("perfil");
                    int ativo = rs.getInt("ativo");
                    int tentativas = rs.getInt("tentativas_falhas");
                    String bloqueadoAte = rs.getString("bloqueado_ate");

                    if (ativo == 0) {
                        resp.put("sucesso", false);
                        resp.put("mensagem", "Login ou senha incorretos");
                        return resp;
                    }

                    // Verifica bloqueio de 15 minutos após 5 tentativas erradas
                    if (bloqueadoAte != null && !bloqueadoAte.isBlank()) {
                        LocalDateTime limite = LocalDateTime.parse(bloqueadoAte, DT_FMT);
                        if (LocalDateTime.now().isBefore(limite)) {
                            resp.put("sucesso", false);
                            resp.put("bloqueado", true);
                            resp.put("mensagem", "Conta temporariamente bloqueada por 15 minutos após 5 tentativas incorretas. Tente novamente mais tarde.");
                            return resp;
                        }
                    }

                    boolean senhaCorreta = BcryptUtil.matches(senha, senhaHash);
                    if (!senhaCorreta) {
                        int novasTentativas = tentativas + 1;
                        String novoBloqueio = null;
                        if (novasTentativas >= 5) {
                            novoBloqueio = LocalDateTime.now().plusMinutes(15).format(DT_FMT);
                        }
                        try (PreparedStatement psUp = conn.prepareStatement(
                                "UPDATE usuario SET tentativas_falhas = ?, bloqueado_ate = ? WHERE id = ?")) {
                            psUp.setInt(1, novasTentativas);
                            psUp.setString(2, novoBloqueio);
                            psUp.setInt(3, userId);
                            psUp.executeUpdate();
                        }
                        registrarLog(conn, userId, nome, perfil, "TENTATIVA_LOGIN_FALHA", "Tentativa #" + novasTentativas, ip);
                        resp.put("sucesso", false);
                        if (novasTentativas >= 5) {
                            resp.put("bloqueado", true);
                            resp.put("mensagem", "Muitas tentativas incorretas. Acesso bloqueado por 15 minutos por segurança.");
                        } else {
                            resp.put("mensagem", "Login ou senha incorretos");
                        }
                        return resp;
                    }

                    // Sucesso: limpa tentativas e atualiza último acesso
                    String agora = LocalDateTime.now().format(DT_FMT);
                    try (PreparedStatement psOk = conn.prepareStatement(
                            "UPDATE usuario SET tentativas_falhas = 0, bloqueado_ate = NULL, ultimo_acesso = ? WHERE id = ?")) {
                        psOk.setString(1, agora);
                        psOk.setInt(2, userId);
                        psOk.executeUpdate();
                    }

                    Integer alunoId = null;
                    Integer empresaId = null;
                    String cursoNome = null;
                    Integer modulo = null;
                    Boolean egresso = false;
                    String empresaNome = null;
                    String empresaStatus = null;

                    if ("ALUNO".equals(perfil) || "EGRESSO".equals(perfil)) {
                        try (PreparedStatement psA = conn.prepareStatement(
                                "SELECT a.id, a.modulo, a.egresso, c.nome as curso_nome FROM aluno a JOIN curso c ON c.id = a.curso_id WHERE a.usuario_id = ?")) {
                            psA.setInt(1, userId);
                            try (ResultSet rsA = psA.executeQuery()) {
                                if (rsA.next()) {
                                    alunoId = rsA.getInt("id");
                                    modulo = rsA.getInt("modulo");
                                    egresso = rsA.getInt("egresso") == 1;
                                    cursoNome = rsA.getString("curso_nome");
                                    if (egresso) perfil = "EGRESSO";
                                }
                            }
                        }
                    } else if ("EMPRESA".equals(perfil)) {
                        try (PreparedStatement psE = conn.prepareStatement(
                                "SELECT e.id, e.nome_fantasia, e.status FROM empresa e JOIN empresa_usuario eu ON eu.empresa_id = e.id WHERE eu.usuario_id = ?")) {
                            psE.setInt(1, userId);
                            try (ResultSet rsE = psE.executeQuery()) {
                                if (rsE.next()) {
                                    empresaId = rsE.getInt("id");
                                    empresaNome = rsE.getString("nome_fantasia");
                                    empresaStatus = rsE.getString("status");
                                }
                            }
                        }
                    }

                    // Sessão expira em 30 min no painel da ETEC e 2 horas (120 min) nos demais
                    long minutosSessao = ("COORDENACAO".equals(perfil) || "ADMIN".equals(perfil)) ? 30L : 120L;
                    long expEpoch = Instant.now().plusSeconds(minutosSessao * 60L).getEpochSecond();

                    UserSession session = new UserSession(userId, nome, email, perfil, alunoId, empresaId, expEpoch);
                    String jwt = gerarTokenJwt(session);

                    registrarLog(conn, userId, nome, perfil, "LOGIN_SUCESSO", "Acesso via " + tipo + " (expira em " + minutosSessao + " min)", ip);

                    Map<String, Object> usuarioMap = new LinkedHashMap<>();
                    usuarioMap.put("id", userId);
                    usuarioMap.put("nome", nome);
                    usuarioMap.put("email", email);
                    usuarioMap.put("perfil", perfil);
                    usuarioMap.put("alunoId", alunoId);
                    usuarioMap.put("empresaId", empresaId);
                    usuarioMap.put("cursoNome", cursoNome);
                    usuarioMap.put("modulo", modulo);
                    usuarioMap.put("egresso", egresso);
                    usuarioMap.put("empresaNome", empresaNome);
                    usuarioMap.put("empresaStatus", empresaStatus);
                    usuarioMap.put("sessaoMinutos", minutosSessao);

                    String rotaPainel = switch (perfil) {
                        case "ALUNO", "EGRESSO" -> "/painel/aluno";
                        case "EMPRESA" -> "/painel/empresa";
                        default -> "/painel/etec";
                    };

                    resp.put("sucesso", true);
                    resp.put("token", jwt);
                    resp.put("usuario", usuarioMap);
                    resp.put("rotaPainel", rotaPainel);
                    return resp;
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
            resp.put("sucesso", false);
            resp.put("mensagem", "Login ou senha incorretos");
            return resp;
        }
    }

    public void registrarLog(Connection conn, Integer usuarioId, String usuarioNome, String perfil, String acao, String alvo, String ip) {
        try (PreparedStatement ps = conn.prepareStatement(
                "INSERT INTO log_auditoria (usuario_id, usuario_nome, perfil, acao, alvo, data, ip) VALUES (?, ?, ?, ?, ?, ?, ?)")) {
            if (usuarioId != null) ps.setInt(1, usuarioId); else ps.setNull(1, java.sql.Types.INTEGER);
            ps.setString(2, usuarioNome != null ? usuarioNome : "Sistema / Visitante");
            ps.setString(3, perfil != null ? perfil : "SISTEMA");
            ps.setString(4, acao);
            ps.setString(5, alvo);
            ps.setString(6, LocalDateTime.now().format(DT_FMT));
            ps.setString(7, ip != null ? ip : "127.0.0.1");
            ps.executeUpdate();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
