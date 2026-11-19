package br.gov.mt.seciteci.etec.config;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Carga inicial do site institucional com dados públicos oficiais da ETEC Cuiabá / SECITECI-MT.
 * Fontes: secitec.mt.gov.br (página da ETEC Cuiabá, notícias e editais) e
 * sites.google.com/secitec.mt.gov.br/eteccuiaba (site da unidade). Consultadas em 18/11/2026.
 * Só roda quando as tabelas estão vazias, portanto também popula bancos já existentes.
 */
final class InstitucionalSeed {

    private InstitucionalSeed() {}

    private static final String EDITAIS_SECITEC = "https://www.secitec.mt.gov.br/en/editais";

    static void seedIfEmpty(Connection conn) throws Exception {
        String agora = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        boolean autoCommit = conn.getAutoCommit();
        conn.setAutoCommit(false);
        try {
            if (vazia(conn, "noticia")) seedNoticias(conn, agora);
            if (vazia(conn, "edital")) seedEditais(conn, agora);
            if (vazia(conn, "evento_agenda")) seedAgenda(conn, agora);
            conn.commit();
        } catch (Exception e) {
            conn.rollback();
            throw e;
        } finally {
            conn.setAutoCommit(autoCommit);
        }
    }

    private static boolean vazia(Connection conn, String tabela) throws Exception {
        try (Statement st = conn.createStatement(); ResultSet rs = st.executeQuery("SELECT COUNT(*) FROM " + tabela)) {
            return rs.next() && rs.getInt(1) == 0;
        }
    }

    private static void seedNoticias(Connection conn, String agora) throws Exception {
        String sql = "INSERT INTO noticia (slug, titulo, resumo, conteudo, categoria, data_publicacao, autor, fonte_url, publicada, criado_em) VALUES (?,?,?,?,?,?,?,?,1,?)";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            add(ps, agora,
                "seciteci-lanca-edital-professores-e-tecnicos-2026",
                "Seciteci lança edital para processo seletivo de contratação de professores e técnicos",
                "Inscrições de 3 a 26 de novembro pelo Instituto Selecon. A ETEC Cuiabá está entre as 17 escolas técnicas contempladas.",
                "A Secretaria de Estado de Ciência, Tecnologia e Inovação (Seciteci) publicou edital de processo seletivo simplificado para formação de cadastro de reserva de professores da Educação Profissional e Tecnológica e de técnicos de apoio educacional para as Escolas Técnicas Estaduais de Mato Grosso.\n\n"
                + "As inscrições ficam abertas entre os dias 3 e 26 de novembro de 2026, exclusivamente pelo site do Instituto Selecon (selecon.org.br). A taxa de inscrição é de R$ 75,00, e os pedidos de isenção puderam ser feitos entre 3 e 5 de novembro.\n\n"
                + "Não haverá prova escrita: a seleção será feita por análise de títulos e experiência profissional. A remuneração dos professores varia de R$ 3.234,33 a R$ 12.937,29, conforme titulação e jornada de 20, 30 ou 40 horas semanais. Para técnico de apoio educacional, o salário é de R$ 3.201,98 para 40 horas semanais.\n\n"
                + "O candidato escolhe um perfil e uma ETEC — Cuiabá está entre as 17 unidades listadas. O resultado está previsto para 10 de dezembro de 2026.",
                "Processo seletivo", "2026-10-29", "Seciteci / Governo de MT",
                "https://atualmt.com.br/2026/10/29/seciteci-lanca-edital-para-processo-seletivo-de-contratacao-de-professores-e-tecnicos");

            add(ps, agora,
                "seciteci-abre-160-vagas-cursos-tecnicos-gratuitos",
                "Seciteci abre 160 vagas para cursos técnicos gratuitos em Cuiabá, Várzea Grande e Itanhangá",
                "40 vagas são para o curso Técnico em Segurança do Trabalho na ETEC Cuiabá, com aulas noturnas e presenciais a partir de 21 de julho.",
                "A Seciteci abriu processo seletivo para cursos técnicos gratuitos no 2º semestre de 2026, com 160 vagas. As inscrições foram gratuitas e feitas online entre os dias 18 e 24 de junho. Puderam se inscrever candidatos que concluíram ou estão cursando o ensino médio.\n\n"
                + "Distribuição das vagas: 80 para Técnico em Enfermagem (ETEC de Várzea Grande); 40 para Técnico em Segurança do Trabalho (ETEC de Cuiabá); e 40 para Técnico em Agropecuária, em Itanhangá, pela ETEC de Lucas do Rio Verde.\n\n"
                + "Os cursos têm carga horária entre 1.200 e 1.600 horas, com aulas no período noturno e presenciais. Há reserva de vagas para autodeclarados negros (pretos e pardos), oriundos de escola pública, indígenas e pessoas com deficiência.\n\n"
                + "Cronograma: sorteio eletrônico público em 1º de julho, às 9h, ao vivo no YouTube da Seciteci; lista oficial de classificados e primeira convocação em 8 de julho; matrículas da 1ª chamada de 9 a 14 de julho; início das aulas em 21 de julho de 2026.",
                "Processo seletivo", "2026-06-18", "Beatriz Passos | Seciteci",
                "https://www.secitec.mt.gov.br/w/seciteci-abre-160-vagas-para-cursos-t%C3%A9cnicos-gratuitos-em-cuiab%C3%A1-v%C3%A1rzea-grande-e-itanhang%C3%A1");

            add(ps, agora,
                "seciteci-premia-ganhadores-mostra-estadual-escolas-tecnicas",
                "Seciteci premia alunos e professores ganhadores da Mostra Estadual das Escolas Técnicas",
                "A cerimônia de entrega dos prêmios da Mostra Estadual das Escolas Técnicas (MEET) foi realizada na ETEC de Cuiabá.",
                "A Seciteci realizou na ETEC de Cuiabá a entrega dos prêmios aos alunos e professores vencedores da Mostra Estadual das Escolas Técnicas (MEET-SECITECI), evento que reúne projetos desenvolvidos pelos estudantes da rede estadual de educação profissional e tecnológica.\n\n"
                + "Leia a matéria completa no site oficial da Seciteci.",
                "Eventos", null, "Seciteci",
                "https://www.secitec.mt.gov.br/w/seciteci-premia-alunos-e-professores-ganhadores-da-mostra-estadual-das-escolas-t%C3%A9cnicas");

            add(ps, agora,
                "arte-e-esporte-escolas-tecnicas-estaduais",
                "Arte e esporte ganham voz própria nas escolas técnicas estaduais de Mato Grosso",
                "Iniciativas de arte e esporte passam a integrar o dia a dia das Escolas Técnicas Estaduais da rede Seciteci.",
                "Matéria da Seciteci sobre as ações de arte e esporte desenvolvidas nas Escolas Técnicas Estaduais de Mato Grosso, entre elas a ETEC Cuiabá.\n\n"
                + "Leia a matéria completa no site oficial da Seciteci.",
                "Vida escolar", null, "Seciteci",
                "https://www.secitec.mt.gov.br/w/arte-e-esporte-ganham-voz-pr%C3%B3pria-nas-escolas-t%C3%A9cnicas-estaduais-de-mato-grosso");
            ps.executeBatch();
        }
    }

    private static void add(PreparedStatement ps, String agora, String slug, String titulo, String resumo, String conteudo,
                            String categoria, String data, String autor, String fonte) throws Exception {
        ps.setString(1, slug);
        ps.setString(2, titulo);
        ps.setString(3, resumo);
        ps.setString(4, conteudo);
        ps.setString(5, categoria);
        ps.setString(6, data);
        ps.setString(7, autor);
        ps.setString(8, fonte);
        ps.setString(9, agora);
        ps.addBatch();
    }

    private static void seedEditais(Connection conn, String agora) throws Exception {
        String sql = "INSERT INTO edital (numero, orgao, titulo, descricao, categoria, status, inscricao_inicio, inscricao_fim, documento_url, publicado, criado_em) VALUES (?,?,?,?,?,?,?,?,?,1,?)";
        Object[][] dados = {
            {"012/2026", "SECITECI/MT", "Processo seletivo simplificado — professores da EPT e técnicos de apoio educacional",
             "Cadastro de reserva para as Escolas Técnicas Estaduais de MT, incluindo a ETEC Cuiabá. Inscrições pelo Instituto Selecon (taxa R$ 75,00). Seleção por análise de títulos e experiência, sem prova escrita. Resultado previsto para 10/12/2026.",
             "Servidores", "aberto", "2026-11-03", "2026-11-26",
             "https://www.secitec.mt.gov.br/documents/d/secitec/edital-n-012-2026-seciteci-mt-processo-seletivo-simplificado-para-selecao-de-professores-e-tecnicos-para-as-escolas-tecnicas-estaduais"},
            {"011/2026", "SECITECI/MT", "Processo seletivo de alunos para cursos técnicos nas ETECs — 2026/2",
             "40 vagas para Técnico em Segurança do Trabalho na ETEC Cuiabá (noturno, presencial). Seleção por sorteio eletrônico público em 01/07/2026. Listas de classificação e convocações (1ª, 2ª e 3ª chamadas) publicadas.",
             "Alunos", "encerrado", "2026-06-18", "2026-06-24",
             "https://www.secitec.mt.gov.br/documents/d/secitec/edital-n-011-2026-seciteci-mt-processo-seletivo-de-alunos-para-cursos-tecnicos-nas-etecs-2026-2"},
            {"010/2026", "SECITECI/MT", "V Mostra Estadual das Escolas Técnicas (MEET-SECITECI)",
             "Regulamento da quinta edição da mostra de projetos dos estudantes das Escolas Técnicas Estaduais. Possui retificação nº 01.",
             "Eventos", "em_andamento", null, null,
             "https://www.secitec.mt.gov.br/documents/d/secitec/edital-n-010-2026-seciteci-mt-v-mostra-estadual-das-escolas-tecnicas-meet-seciteci"},
            {"006/2026", "SECITECI/MT", "Processo seletivo de alunos para cursos técnicos nas ETECs — 2º semestre",
             "Inclui as listas oficiais do sorteio da ETEC Cuiabá e Mimoso e a lista oficial de aprovados de Enfermagem da ETEC Cuiabá. Sorteio realizado em 22/05/2026; retificadores nº 1 a 6.",
             "Alunos", "encerrado", null, null,
             "https://www.secitec.mt.gov.br/documents/d/secitec/edital-n-006-2026-seciteci-mt-processo-seletivo-de-alunos-para-cursos-tecnicos-nas-etecs-2-semestre"},
            {"004/2026", "SECITECI/MT", "Processo seletivo emergencial — professor de Educação Profissional nas ETECs",
             "Classificação final por perfil e por município, retificada em 09/03/2026.",
             "Servidores", "encerrado", null, null, EDITAIS_SECITEC},
            {"03/2026", "ETEC Cuiabá", "Aproveitamento de estudos — Recursos Humanos, Segurança do Trabalho e Enfermagem",
             "Aproveitamento de disciplinas para os cursos técnicos da unidade. Resultado preliminar, recursos e resultado final publicados.",
             "Alunos", "encerrado", null, null,
             "https://drive.google.com/file/d/14ffZFJORlTAelLuPLtqd8BVKIwdVUKl5/view?usp=sharing"},
            {"01/2026", "ETEC Cuiabá", "Cursos FIC — Apoio e Cuidados do Idoso, Apoio e Cuidados Infantis e Assistente de Contabilidade",
             "Seleção de alunos para cursos de Formação Inicial e Continuada (FIC). Convocação para matrícula e resultado final publicados.",
             "FIC", "encerrado", null, null,
             "https://drive.google.com/file/d/1LDEtVG1FNNW-edPLsEFFP4iFs7jUv7Qh/view"},
        };
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            for (Object[] d : dados) {
                for (int i = 0; i < 9; i++) ps.setString(i + 1, (String) d[i]);
                ps.setString(10, agora);
                ps.addBatch();
            }
            ps.executeBatch();
        }
    }

    private static void seedAgenda(Connection conn, String agora) throws Exception {
        String sql = "INSERT INTO evento_agenda (titulo, descricao, data_inicio, data_fim, horario, local, link_url, publicado, criado_em) VALUES (?,?,?,?,?,?,?,1,?)";
        String ed11 = "https://www.secitec.mt.gov.br/documents/d/secitec/edital-n-011-2026-seciteci-mt-processo-seletivo-de-alunos-para-cursos-tecnicos-nas-etecs-2026-2";
        String ed12 = "https://selecon.org.br/";
        Object[][] dados = {
            {"Resultado do processo seletivo de professores e técnicos (Edital 012/2026)", "Divulgação prevista do resultado da seleção por análise de títulos.", "2026-12-10", null, null, "Online — Instituto Selecon", ed12},
            {"Inscrições — professores e técnicos de apoio educacional (Edital 012/2026)", "Inscrições pelo site do Instituto Selecon. Taxa de R$ 75,00.", "2026-11-03", "2026-11-26", null, "Online — Instituto Selecon", ed12},
            {"Pedido de isenção da taxa (Edital 012/2026)", "Prazo para solicitar isenção da taxa de inscrição.", "2026-11-03", "2026-11-05", null, "Online — Instituto Selecon", ed12},
            {"Início das aulas — cursos técnicos 2026/2", "Começo do semestre letivo para os aprovados no Edital 011/2026.", "2026-07-21", null, "Noturno", "ETEC Cuiabá", ed11},
            {"Matrículas da 1ª chamada (Edital 011/2026)", "Matrícula dos candidatos convocados na primeira chamada.", "2026-07-09", "2026-07-14", null, "ETEC Cuiabá", ed11},
            {"Lista oficial de classificados e 1ª convocação (Edital 011/2026)", null, "2026-07-08", null, null, "Site da Seciteci", ed11},
            {"Sorteio eletrônico público — cursos técnicos 2026/2", "Transmissão ao vivo no YouTube da Seciteci.", "2026-07-01", null, "9h", "YouTube da Seciteci", ed11},
            {"Inscrições — cursos técnicos gratuitos 2026/2 (Edital 011/2026)", "Inscrições online e gratuitas para quem concluiu ou está cursando o ensino médio.", "2026-06-18", "2026-06-24", null, "Online", ed11},
            {"Sorteio do Edital 006/2026 — cursos técnicos", null, "2026-05-22", null, null, "Online", EDITAIS_SECITEC},
        };
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            for (Object[] d : dados) {
                for (int i = 0; i < 7; i++) ps.setString(i + 1, (String) d[i]);
                ps.setString(8, agora);
                ps.addBatch();
            }
            ps.executeBatch();
        }
    }
}
