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
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.Statement;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

/**
 * Site institucional da ETEC Cuiabá: notícias, editais, agenda, indicadores e Fale Conosco.
 * Leitura pública em /api/institucional/*; gestão restrita à Coordenação/Admin em /api/institucional/admin/*.
 */
@Path("/api/institucional")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class InstitucionalResource {

    @Inject
    DatabaseManager db;

    @Inject
    AuthService authService;

    private static final DateTimeFormatter DT_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    private static final Pattern DATA = Pattern.compile("^\\d{4}-\\d{2}-\\d{2}$");
    private static final Set<String> STATUS_EDITAL = Set.of("aberto", "em_andamento", "encerrado");
    /** Limite simples anti-spam do Fale Conosco: 1 mensagem por IP a cada 60s. */
    private static final Map<String, Long> ULTIMO_CONTATO = new ConcurrentHashMap<>();

    // ───────────────────────────── PÚBLICO ─────────────────────────────

    @GET
    @Path("/resumo")
    public Response resumo() {
        String hoje = LocalDate.now().toString();
        try (Connection conn = db.getConnection()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("vagasAbertas", contar(conn,
                    "SELECT COUNT(*) FROM vaga v JOIN empresa e ON e.id = v.empresa_id WHERE v.status = 'publicada' AND v.prazo >= ? AND e.status = 'aprovada'", hoje));
            m.put("empresasParceiras", contar(conn, "SELECT COUNT(*) FROM empresa WHERE status = 'aprovada'"));
            m.put("editaisAbertos", contar(conn, "SELECT COUNT(*) FROM edital WHERE publicado = 1 AND status IN ('aberto','em_andamento')"));
            m.put("proximosEventos", contar(conn, "SELECT COUNT(*) FROM evento_agenda WHERE publicado = 1 AND COALESCE(data_fim, data_inicio) >= ?", hoje));
            return Response.ok(m).build();
        } catch (Exception e) {
            return erro(e);
        }
    }

    @GET
    @Path("/noticias")
    public Response listarNoticias(@QueryParam("busca") String busca, @QueryParam("categoria") String categoria,
                                   @QueryParam("limite") Integer limite) {
        StringBuilder sql = new StringBuilder("SELECT id, slug, titulo, resumo, categoria, data_publicacao, autor, fonte_url FROM noticia WHERE publicada = 1");
        List<Object> p = new ArrayList<>();
        if (busca != null && !busca.isBlank()) {
            sql.append(" AND (titulo LIKE ? OR resumo LIKE ? OR conteudo LIKE ?)");
            String b = "%" + busca.trim() + "%";
            p.add(b); p.add(b); p.add(b);
        }
        if (categoria != null && !categoria.isBlank()) {
            sql.append(" AND categoria = ?");
            p.add(categoria);
        }
        sql.append(" ORDER BY data_publicacao IS NULL, data_publicacao DESC, id DESC");
        if (limite != null && limite > 0) sql.append(" LIMIT ").append(Math.min(limite, 100));
        return consultar(sql.toString(), p);
    }

    @GET
    @Path("/noticias/{slug}")
    public Response detalheNoticia(@PathParam("slug") String slug) {
        try (Connection conn = db.getConnection();
             PreparedStatement ps = conn.prepareStatement("SELECT * FROM noticia WHERE publicada = 1 AND (slug = ? OR CAST(id AS TEXT) = ?)")) {
            ps.setString(1, slug);
            ps.setString(2, slug);
            List<Map<String, Object>> r = mapear(ps.executeQuery());
            if (r.isEmpty()) return naoEncontrado("Notícia não encontrada.");
            return Response.ok(r.get(0)).build();
        } catch (Exception e) {
            return erro(e);
        }
    }

    @GET
    @Path("/editais")
    public Response listarEditais(@QueryParam("status") String status, @QueryParam("categoria") String categoria,
                                  @QueryParam("limite") Integer limite) {
        StringBuilder sql = new StringBuilder("SELECT id, numero, orgao, titulo, descricao, categoria, status, inscricao_inicio, inscricao_fim, documento_url FROM edital WHERE publicado = 1");
        List<Object> p = new ArrayList<>();
        if (status != null && !status.isBlank()) {
            sql.append(" AND status = ?");
            p.add(status);
        }
        if (categoria != null && !categoria.isBlank()) {
            sql.append(" AND categoria = ?");
            p.add(categoria);
        }
        sql.append(" ORDER BY CASE status WHEN 'aberto' THEN 0 WHEN 'em_andamento' THEN 1 ELSE 2 END, ")
           .append("CAST(substr(numero, instr(numero, '/') + 1) AS INTEGER) DESC, CAST(numero AS INTEGER) DESC");
        if (limite != null && limite > 0) sql.append(" LIMIT ").append(Math.min(limite, 100));
        return consultar(sql.toString(), p);
    }

    @GET
    @Path("/agenda")
    public Response listarAgenda(@QueryParam("periodo") String periodo) {
        String hoje = LocalDate.now().toString();
        String sql = "SELECT id, titulo, descricao, data_inicio, data_fim, horario, local, link_url FROM evento_agenda WHERE publicado = 1";
        List<Object> p = new ArrayList<>();
        if ("proximos".equals(periodo)) {
            sql += " AND COALESCE(data_fim, data_inicio) >= ? ORDER BY data_inicio ASC";
            p.add(hoje);
        } else if ("passados".equals(periodo)) {
            sql += " AND COALESCE(data_fim, data_inicio) < ? ORDER BY data_inicio DESC";
            p.add(hoje);
        } else {
            sql += " ORDER BY data_inicio DESC";
        }
        return consultar(sql, p);
    }

    @POST
    @Path("/contato")
    public Response enviarContato(Map<String, Object> body, @HeaderParam("X-Forwarded-For") String ipHeader) {
        String ip = ipHeader != null ? ipHeader.split(",")[0].trim() : "127.0.0.1";
        String nome = txt(body, "nome");
        String email = txt(body, "email");
        String telefone = txt(body, "telefone");
        String assunto = txt(body, "assunto");
        String mensagem = txt(body, "mensagem");
        boolean consentimento = Boolean.TRUE.equals(body != null ? body.get("consentimento") : null);

        List<String> erros = new ArrayList<>();
        if (nome.length() < 3 || nome.length() > 120) erros.add("Informe seu nome completo.");
        if (!EMAIL.matcher(email).matches() || email.length() > 160) erros.add("Informe um e-mail válido.");
        if (telefone.length() > 30) erros.add("Telefone inválido.");
        if (assunto.isEmpty() || assunto.length() > 120) erros.add("Escolha o assunto.");
        if (mensagem.length() < 10 || mensagem.length() > 3000) erros.add("A mensagem deve ter entre 10 e 3.000 caracteres.");
        if (!consentimento) erros.add("É preciso concordar com o uso dos dados para resposta (LGPD).");
        if (!erros.isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST).entity(Map.of("mensagem", String.join(" ", erros), "erros", erros)).build();
        }

        long agoraMs = System.currentTimeMillis();
        Long anterior = ULTIMO_CONTATO.get(ip);
        if (anterior != null && agoraMs - anterior < 60_000) {
            return Response.status(429).entity(Map.of("mensagem", "Aguarde um minuto antes de enviar outra mensagem.")).build();
        }

        try (Connection conn = db.getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "INSERT INTO mensagem_contato (nome, email, telefone, assunto, mensagem, ip, lida, criado_em) VALUES (?,?,?,?,?,?,0,?)",
                     Statement.RETURN_GENERATED_KEYS)) {
            ps.setString(1, nome);
            ps.setString(2, email);
            ps.setString(3, telefone.isEmpty() ? null : telefone);
            ps.setString(4, assunto);
            ps.setString(5, mensagem);
            ps.setString(6, ip);
            ps.setString(7, LocalDateTime.now().format(DT_FMT));
            ps.executeUpdate();
            long protocolo = 0;
            try (ResultSet k = ps.getGeneratedKeys()) { if (k.next()) protocolo = k.getLong(1); }
            ULTIMO_CONTATO.put(ip, agoraMs);
            String numero = String.format("ETEC-%d-%05d", LocalDate.now().getYear(), protocolo);
            return Response.status(Response.Status.CREATED).entity(Map.of(
                    "mensagem", "Mensagem recebida! A secretaria da ETEC Cuiabá responderá pelo e-mail informado.",
                    "protocolo", numero)).build();
        } catch (Exception e) {
            return erro(e);
        }
    }

    // ─────────────────────── GESTÃO (COORDENAÇÃO / ADMIN) ───────────────────────

    private AuthService.UserSession exigirEtec(String authHeader) {
        AuthService.UserSession s = authService.validarTokenHeader(authHeader);
        if (s == null || (!"COORDENACAO".equals(s.perfil()) && !"ADMIN".equals(s.perfil()))) return null;
        return s;
    }

    private Response proibido() {
        return Response.status(Response.Status.FORBIDDEN).entity(Map.of("mensagem", "Acesso restrito à Coordenação e TI da ETEC.")).build();
    }

    @GET
    @Path("/admin")
    public Response painelAdmin(@HeaderParam("Authorization") String auth) {
        if (exigirEtec(auth) == null) return proibido();
        try (Connection conn = db.getConnection(); Statement st = conn.createStatement()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("noticias", mapear(st.executeQuery("SELECT * FROM noticia ORDER BY data_publicacao IS NULL, data_publicacao DESC, id DESC")));
            m.put("editais", mapear(st.executeQuery("SELECT * FROM edital ORDER BY id DESC")));
            m.put("agenda", mapear(st.executeQuery("SELECT * FROM evento_agenda ORDER BY data_inicio DESC")));
            m.put("mensagens", mapear(st.executeQuery("SELECT * FROM mensagem_contato ORDER BY lida ASC, id DESC")));
            return Response.ok(m).build();
        } catch (Exception e) {
            return erro(e);
        }
    }

    @POST
    @Path("/admin/noticias")
    public Response criarNoticia(Map<String, Object> body, @HeaderParam("Authorization") String auth) {
        return salvarNoticia(null, body, auth);
    }

    @PUT
    @Path("/admin/noticias/{id}")
    public Response editarNoticia(@PathParam("id") int id, Map<String, Object> body, @HeaderParam("Authorization") String auth) {
        return salvarNoticia(id, body, auth);
    }

    private Response salvarNoticia(Integer id, Map<String, Object> body, String auth) {
        AuthService.UserSession s = exigirEtec(auth);
        if (s == null) return proibido();
        String titulo = txt(body, "titulo");
        String resumo = txt(body, "resumo");
        String conteudo = txt(body, "conteudo");
        String data = txt(body, "data_publicacao");
        if (titulo.length() < 5 || resumo.length() < 10 || conteudo.length() < 10) {
            return invalido("Título (mín. 5), resumo e conteúdo (mín. 10 caracteres) são obrigatórios.");
        }
        if (!data.isEmpty() && !DATA.matcher(data).matches()) return invalido("Data de publicação inválida.");
        String categoria = txt(body, "categoria").isEmpty() ? "Institucional" : txt(body, "categoria");
        int publicada = Boolean.FALSE.equals(body.get("publicada")) ? 0 : 1;

        try (Connection conn = db.getConnection()) {
            if (id == null) {
                String slug = slugUnico(conn, slugify(titulo));
                try (PreparedStatement ps = conn.prepareStatement(
                        "INSERT INTO noticia (slug, titulo, resumo, conteudo, categoria, data_publicacao, autor, fonte_url, publicada, criado_em) VALUES (?,?,?,?,?,?,?,?,?,?)")) {
                    ps.setString(1, slug);
                    preencherNoticia(ps, 2, titulo, resumo, conteudo, categoria, data, txt(body, "autor"), txt(body, "fonte_url"), publicada);
                    ps.setString(10, LocalDateTime.now().format(DT_FMT));
                    ps.executeUpdate();
                }
            } else {
                try (PreparedStatement ps = conn.prepareStatement(
                        "UPDATE noticia SET titulo=?, resumo=?, conteudo=?, categoria=?, data_publicacao=?, autor=?, fonte_url=?, publicada=? WHERE id=?")) {
                    preencherNoticia(ps, 1, titulo, resumo, conteudo, categoria, data, txt(body, "autor"), txt(body, "fonte_url"), publicada);
                    ps.setInt(9, id);
                    if (ps.executeUpdate() == 0) return naoEncontrado("Notícia não encontrada.");
                }
            }
            authService.registrarLog(conn, s.usuarioId(), s.nome(), s.perfil(), id == null ? "NOTICIA_CRIADA" : "NOTICIA_EDITADA", titulo, null);
            return Response.ok(Map.of("mensagem", "Notícia salva com sucesso.")).build();
        } catch (Exception e) {
            return erro(e);
        }
    }

    private void preencherNoticia(PreparedStatement ps, int i, String titulo, String resumo, String conteudo, String categoria,
                                  String data, String autor, String fonte, int publicada) throws Exception {
        ps.setString(i, titulo);
        ps.setString(i + 1, resumo);
        ps.setString(i + 2, conteudo);
        ps.setString(i + 3, categoria);
        ps.setString(i + 4, nulo(data));
        ps.setString(i + 5, nulo(autor));
        ps.setString(i + 6, nulo(fonte));
        ps.setInt(i + 7, publicada);
    }

    @POST
    @Path("/admin/editais")
    public Response criarEdital(Map<String, Object> body, @HeaderParam("Authorization") String auth) {
        return salvarEdital(null, body, auth);
    }

    @PUT
    @Path("/admin/editais/{id}")
    public Response editarEdital(@PathParam("id") int id, Map<String, Object> body, @HeaderParam("Authorization") String auth) {
        return salvarEdital(id, body, auth);
    }

    private Response salvarEdital(Integer id, Map<String, Object> body, String auth) {
        AuthService.UserSession s = exigirEtec(auth);
        if (s == null) return proibido();
        String numero = txt(body, "numero");
        String titulo = txt(body, "titulo");
        String descricao = txt(body, "descricao");
        String status = txt(body, "status").isEmpty() ? "aberto" : txt(body, "status");
        String ini = txt(body, "inscricao_inicio");
        String fim = txt(body, "inscricao_fim");
        if (numero.isEmpty() || titulo.length() < 5 || descricao.length() < 10) return invalido("Número, título e descrição são obrigatórios.");
        if (!STATUS_EDITAL.contains(status)) return invalido("Status inválido.");
        if ((!ini.isEmpty() && !DATA.matcher(ini).matches()) || (!fim.isEmpty() && !DATA.matcher(fim).matches())) return invalido("Datas de inscrição inválidas.");
        if (!ini.isEmpty() && !fim.isEmpty() && fim.compareTo(ini) < 0) return invalido("O fim das inscrições deve ser depois do início.");
        String url = txt(body, "documento_url");
        if (!url.isEmpty() && !url.startsWith("http")) return invalido("O link do documento deve começar com http.");

        String sqlIns = "INSERT INTO edital (numero, orgao, titulo, descricao, categoria, status, inscricao_inicio, inscricao_fim, documento_url, publicado, criado_em) VALUES (?,?,?,?,?,?,?,?,?,?,?)";
        String sqlUpd = "UPDATE edital SET numero=?, orgao=?, titulo=?, descricao=?, categoria=?, status=?, inscricao_inicio=?, inscricao_fim=?, documento_url=?, publicado=? WHERE id=?";
        try (Connection conn = db.getConnection(); PreparedStatement ps = conn.prepareStatement(id == null ? sqlIns : sqlUpd)) {
            ps.setString(1, numero);
            ps.setString(2, txt(body, "orgao").isEmpty() ? "ETEC Cuiabá" : txt(body, "orgao"));
            ps.setString(3, titulo);
            ps.setString(4, descricao);
            ps.setString(5, txt(body, "categoria").isEmpty() ? "Alunos" : txt(body, "categoria"));
            ps.setString(6, status);
            ps.setString(7, nulo(ini));
            ps.setString(8, nulo(fim));
            ps.setString(9, nulo(url));
            ps.setInt(10, Boolean.FALSE.equals(body.get("publicado")) ? 0 : 1);
            if (id == null) ps.setString(11, LocalDateTime.now().format(DT_FMT)); else ps.setInt(11, id);
            if (ps.executeUpdate() == 0) return naoEncontrado("Edital não encontrado.");
            authService.registrarLog(conn, s.usuarioId(), s.nome(), s.perfil(), id == null ? "EDITAL_CRIADO" : "EDITAL_EDITADO", numero + " — " + titulo, null);
            return Response.ok(Map.of("mensagem", "Edital salvo com sucesso.")).build();
        } catch (Exception e) {
            return erro(e);
        }
    }

    @POST
    @Path("/admin/agenda")
    public Response criarEvento(Map<String, Object> body, @HeaderParam("Authorization") String auth) {
        return salvarEvento(null, body, auth);
    }

    @PUT
    @Path("/admin/agenda/{id}")
    public Response editarEvento(@PathParam("id") int id, Map<String, Object> body, @HeaderParam("Authorization") String auth) {
        return salvarEvento(id, body, auth);
    }

    private Response salvarEvento(Integer id, Map<String, Object> body, String auth) {
        AuthService.UserSession s = exigirEtec(auth);
        if (s == null) return proibido();
        String titulo = txt(body, "titulo");
        String ini = txt(body, "data_inicio");
        String fim = txt(body, "data_fim");
        if (titulo.length() < 5) return invalido("Informe o título do evento.");
        if (!DATA.matcher(ini).matches()) return invalido("Informe a data de início.");
        if (!fim.isEmpty() && (!DATA.matcher(fim).matches() || fim.compareTo(ini) < 0)) return invalido("Data de término inválida.");

        String sqlIns = "INSERT INTO evento_agenda (titulo, descricao, data_inicio, data_fim, horario, local, link_url, publicado, criado_em) VALUES (?,?,?,?,?,?,?,?,?)";
        String sqlUpd = "UPDATE evento_agenda SET titulo=?, descricao=?, data_inicio=?, data_fim=?, horario=?, local=?, link_url=?, publicado=? WHERE id=?";
        try (Connection conn = db.getConnection(); PreparedStatement ps = conn.prepareStatement(id == null ? sqlIns : sqlUpd)) {
            ps.setString(1, titulo);
            ps.setString(2, nulo(txt(body, "descricao")));
            ps.setString(3, ini);
            ps.setString(4, nulo(fim));
            ps.setString(5, nulo(txt(body, "horario")));
            ps.setString(6, nulo(txt(body, "local")));
            ps.setString(7, nulo(txt(body, "link_url")));
            ps.setInt(8, Boolean.FALSE.equals(body.get("publicado")) ? 0 : 1);
            if (id == null) ps.setString(9, LocalDateTime.now().format(DT_FMT)); else ps.setInt(9, id);
            if (ps.executeUpdate() == 0) return naoEncontrado("Evento não encontrado.");
            authService.registrarLog(conn, s.usuarioId(), s.nome(), s.perfil(), id == null ? "EVENTO_CRIADO" : "EVENTO_EDITADO", titulo, null);
            return Response.ok(Map.of("mensagem", "Evento salvo com sucesso.")).build();
        } catch (Exception e) {
            return erro(e);
        }
    }

    @DELETE
    @Path("/admin/{tipo}/{id}")
    public Response excluir(@PathParam("tipo") String tipo, @PathParam("id") int id, @HeaderParam("Authorization") String auth) {
        AuthService.UserSession s = exigirEtec(auth);
        if (s == null) return proibido();
        String tabela = switch (tipo) {
            case "noticias" -> "noticia";
            case "editais" -> "edital";
            case "agenda" -> "evento_agenda";
            case "mensagens" -> "mensagem_contato";
            default -> null;
        };
        if (tabela == null) return naoEncontrado("Tipo inválido.");
        try (Connection conn = db.getConnection(); PreparedStatement ps = conn.prepareStatement("DELETE FROM " + tabela + " WHERE id = ?")) {
            ps.setInt(1, id);
            if (ps.executeUpdate() == 0) return naoEncontrado("Registro não encontrado.");
            authService.registrarLog(conn, s.usuarioId(), s.nome(), s.perfil(), "INSTITUCIONAL_EXCLUSAO", tabela + " #" + id, null);
            return Response.ok(Map.of("mensagem", "Registro excluído.")).build();
        } catch (Exception e) {
            return erro(e);
        }
    }

    @PUT
    @Path("/admin/mensagens/{id}/lida")
    public Response marcarLida(@PathParam("id") int id, Map<String, Object> body, @HeaderParam("Authorization") String auth) {
        if (exigirEtec(auth) == null) return proibido();
        boolean lida = body == null || !Boolean.FALSE.equals(body.get("lida"));
        try (Connection conn = db.getConnection(); PreparedStatement ps = conn.prepareStatement("UPDATE mensagem_contato SET lida = ? WHERE id = ?")) {
            ps.setInt(1, lida ? 1 : 0);
            ps.setInt(2, id);
            if (ps.executeUpdate() == 0) return naoEncontrado("Mensagem não encontrada.");
            return Response.ok(Map.of("mensagem", lida ? "Mensagem marcada como lida." : "Mensagem marcada como não lida.")).build();
        } catch (Exception e) {
            return erro(e);
        }
    }

    // ───────────────────────────── utilitários ─────────────────────────────

    private Response consultar(String sql, List<Object> params) {
        try (Connection conn = db.getConnection(); PreparedStatement ps = conn.prepareStatement(sql)) {
            for (int i = 0; i < params.size(); i++) ps.setObject(i + 1, params.get(i));
            return Response.ok(mapear(ps.executeQuery())).build();
        } catch (Exception e) {
            return erro(e);
        }
    }

    /** Converte um ResultSet em lista de mapas usando camelCase nas chaves e fecha o ResultSet. */
    private List<Map<String, Object>> mapear(ResultSet rs) throws Exception {
        List<Map<String, Object>> lista = new ArrayList<>();
        try (rs) {
            ResultSetMetaData md = rs.getMetaData();
            while (rs.next()) {
                Map<String, Object> m = new LinkedHashMap<>();
                for (int i = 1; i <= md.getColumnCount(); i++) {
                    m.put(camel(md.getColumnLabel(i)), rs.getObject(i));
                }
                lista.add(m);
            }
        }
        return lista;
    }

    private static String camel(String col) {
        StringBuilder sb = new StringBuilder();
        boolean up = false;
        for (char c : col.toCharArray()) {
            if (c == '_') { up = true; continue; }
            sb.append(up ? Character.toUpperCase(c) : c);
            up = false;
        }
        return sb.toString();
    }

    private int contar(Connection conn, String sql, String... params) throws Exception {
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            for (int i = 0; i < params.length; i++) ps.setString(i + 1, params[i]);
            try (ResultSet rs = ps.executeQuery()) { return rs.next() ? rs.getInt(1) : 0; }
        }
    }

    private String slugUnico(Connection conn, String base) throws Exception {
        String slug = base.isEmpty() ? "noticia" : base;
        int n = 2;
        String candidato = slug;
        while (contar(conn, "SELECT COUNT(*) FROM noticia WHERE slug = ?", candidato) > 0) {
            candidato = slug + "-" + n++;
        }
        return candidato;
    }

    private static String slugify(String s) {
        String n = Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        n = n.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
        return n.length() > 80 ? n.substring(0, 80).replaceAll("-$", "") : n;
    }

    private static String txt(Map<String, Object> body, String k) {
        if (body == null || body.get(k) == null) return "";
        return String.valueOf(body.get(k)).trim();
    }

    private static String nulo(String s) {
        return s == null || s.isBlank() ? null : s;
    }

    private static Response invalido(String msg) {
        return Response.status(Response.Status.BAD_REQUEST).entity(Map.of("mensagem", msg)).build();
    }

    private static Response naoEncontrado(String msg) {
        return Response.status(Response.Status.NOT_FOUND).entity(Map.of("mensagem", msg)).build();
    }

    private static Response erro(Exception e) {
        e.printStackTrace();
        return Response.serverError().entity(Map.of("mensagem", "Erro interno ao processar a solicitação.")).build();
    }
}
