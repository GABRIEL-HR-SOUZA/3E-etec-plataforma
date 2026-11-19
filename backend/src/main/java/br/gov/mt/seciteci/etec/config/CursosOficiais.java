package br.gov.mt.seciteci.etec.config;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;

/**
 * Alinha a tabela curso aos 8 cursos técnicos oficiais da ETEC Cuiabá
 * (site da unidade, "Nossos Cursos"): Agricultura, Agronegócio, Desenvolvimento de Sistemas,
 * Enfermagem, Informática, Manutenção e Suporte em Informática, Redes de Computadores e Segurança do Trabalho.
 *
 * Bancos antigos tinham Administração (id 4), Análises Clínicas (id 7) e Logística (id 8).
 * Os IDs são mantidos (alunos, base da secretaria e vínculos continuam válidos) e só o curso muda.
 * Idempotente: só age se ainda existir algum dos slugs antigos.
 */
final class CursosOficiais {

    private CursosOficiais() {}

    static final String VAGA5_TITULO = "Jovem Aprendiz — Suporte de Informática";
    static final String VAGA5_ATIVIDADES = "Atendimento a chamados de usuários, instalação e configuração de computadores e impressoras, controle de inventário de equipamentos de TI e apoio à equipe de infraestrutura.";
    static final String VAGA5_REQUISITOS = "Estar cursando Técnico em Informática ou Técnico em Manutenção e Suporte em Informática na ETEC Cuiabá (a partir do 1º módulo); idade entre 16 e 24 anos.";

    static final String VAGA8_TITULO = "Estágio em Suporte de TI Hospitalar";
    static final String VAGA8_ATIVIDADES = "Manutenção preventiva de computadores e periféricos dos setores assistenciais, suporte aos sistemas de prontuário eletrônico e registro de chamados no help desk.";
    static final String VAGA8_REQUISITOS = "Matrícula ativa a partir do 2º módulo do Técnico em Manutenção e Suporte em Informática ou do Técnico em Informática da ETEC Cuiabá.";

    private static final String[][] TROCAS = {
        // id, nome, slug, eixo, turno, slug antigo
        {"4", "Técnico em Informática", "informatica", "Informação e Comunicação", "Noite", "administracao"},
        {"7", "Técnico em Manutenção e Suporte em Informática", "manutencao-e-suporte-em-informatica", "Informação e Comunicação", "Noite", "analises-clinicas"},
        {"8", "Técnico em Agricultura", "agricultura", "Recursos Naturais", "Tarde", "logistica"},
    };

    static void migrar(Connection conn) throws Exception {
        try (Statement st = conn.createStatement();
             ResultSet rs = st.executeQuery("SELECT COUNT(*) FROM curso WHERE slug IN ('administracao','analises-clinicas','logistica')")) {
            if (!rs.next() || rs.getInt(1) == 0) return;
        }

        boolean autoCommit = conn.getAutoCommit();
        conn.setAutoCommit(false);
        try (Statement st = conn.createStatement()) {
            try (PreparedStatement ps = conn.prepareStatement(
                    "UPDATE curso SET nome = ?, slug = ?, eixo = ?, turno_padrao = ?, ativo = 1 WHERE id = ? AND slug = ?")) {
                for (String[] t : TROCAS) {
                    ps.setString(1, t[1]);
                    ps.setString(2, t[2]);
                    ps.setString(3, t[3]);
                    ps.setString(4, t[4]);
                    ps.setInt(5, Integer.parseInt(t[0]));
                    ps.setString(6, t[5]);
                    ps.executeUpdate();
                }
            }
            // Cursos antigos que estivessem com outros IDs (cadastrados à mão) apenas saem da oferta
            st.executeUpdate("UPDATE curso SET ativo = 0 WHERE slug IN ('administracao','analises-clinicas','logistica')");
            // Nome oficial do eixo (sem o sufixo antigo)
            st.executeUpdate("UPDATE curso SET eixo = 'Informação e Comunicação' WHERE eixo = 'Informação e Comunicação (Tecnologia)'");

            // Vagas de demonstração que citavam os cursos antigos (só se ainda estiverem com o texto original)
            atualizarVagaDemo(conn, 5, "Jovem Aprendiz — Assistente Administrativo e Logístico", null,
                    VAGA5_TITULO, VAGA5_ATIVIDADES, VAGA5_REQUISITOS, new int[][]{{4, 1}, {7, 1}});
            atualizarVagaDemo(conn, 8, "Estágio Curricular em Análises Clínicas e Laboratório", "Estágio não obrigatório",
                    VAGA8_TITULO, VAGA8_ATIVIDADES, VAGA8_REQUISITOS, new int[][]{{7, 2}, {4, 2}});
            // Vaga de agronegócio também atende Técnico em Agricultura
            try (Statement s2 = conn.createStatement();
                 ResultSet rs = s2.executeQuery("SELECT COUNT(*) FROM vaga WHERE id = 6 AND titulo = 'Estágio Técnico em Agronegócio e Agricultura Digital'")) {
                if (rs.next() && rs.getInt(1) > 0) {
                    st.executeUpdate("INSERT OR IGNORE INTO vaga_curso (vaga_id, curso_id, modulo_minimo) VALUES (6, 8, 2)");
                }
            }
            conn.commit();
            System.out.println("[ETEC Portal de Vagas] Cursos alinhados aos 8 cursos técnicos oficiais da ETEC Cuiabá.");
        } catch (Exception e) {
            conn.rollback();
            throw e;
        } finally {
            conn.setAutoCommit(autoCommit);
        }
    }

    private static void atualizarVagaDemo(Connection conn, int vagaId, String tituloAntigo, String novoTipo, String titulo,
                                          String atividades, String requisitos, int[][] cursos) throws Exception {
        String sql = "UPDATE vaga SET titulo = ?, atividades = ?, requisitos = ?" + (novoTipo != null ? ", tipo = ?" : "") + " WHERE id = ? AND titulo = ?";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            int i = 1;
            ps.setString(i++, titulo);
            ps.setString(i++, atividades);
            ps.setString(i++, requisitos);
            if (novoTipo != null) ps.setString(i++, novoTipo);
            ps.setInt(i++, vagaId);
            ps.setString(i, tituloAntigo);
            if (ps.executeUpdate() == 0) return;
        }
        try (PreparedStatement del = conn.prepareStatement("DELETE FROM vaga_curso WHERE vaga_id = ?")) {
            del.setInt(1, vagaId);
            del.executeUpdate();
        }
        try (PreparedStatement ins = conn.prepareStatement("INSERT INTO vaga_curso (vaga_id, curso_id, modulo_minimo) VALUES (?, ?, ?)")) {
            for (int[] c : cursos) {
                ins.setInt(1, vagaId);
                ins.setInt(2, c[0]);
                ins.setInt(3, c[1]);
                ins.addBatch();
            }
            ins.executeBatch();
        }
    }
}
