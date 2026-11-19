package br.gov.mt.seciteci.etec.config;

import io.quarkus.elytron.security.common.BcryptUtil;
import io.quarkus.runtime.Startup;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.stream.Collectors;

@Startup
@ApplicationScoped
public class DatabaseManager {

    @ConfigProperty(name = "etec.db.path", defaultValue = "./data/etec_vagas.db")
    String dbPath;

    @ConfigProperty(name = "etec.backup.dir", defaultValue = "./data/backups")
    String backupDir;

    @ConfigProperty(name = "etec.storage.dir", defaultValue = "./storage/private_pdfs")
    String storageDir;

    private String jdbcUrl;

    @PostConstruct
    public void init() {
        try {
            Class.forName("org.sqlite.JDBC");
            File dbFile = new File(dbPath);
            if (dbFile.getParentFile() != null) {
                dbFile.getParentFile().mkdirs();
            }
            new File(backupDir).mkdirs();
            new File(storageDir).mkdirs();

            this.jdbcUrl = "jdbc:sqlite:" + dbFile.getAbsolutePath();

            try (Connection conn = getConnection()) {
                configurePragmas(conn);
                runMigrations(conn);
                seedIfEmpty(conn);
                CursosOficiais.migrar(conn);
                InstitucionalSeed.seedIfEmpty(conn);
            }
            System.out.println("[ETEC Portal de Vagas] Banco SQLite inicializado em modo WAL: " + dbFile.getAbsolutePath());
        } catch (Exception e) {
            throw new RuntimeException("Falha ao inicializar banco SQLite do Portal de Vagas ETEC", e);
        }
    }

    public Connection getConnection() throws SQLException {
        Connection conn = DriverManager.getConnection(jdbcUrl);
        configurePragmas(conn);
        return conn;
    }

    private void configurePragmas(Connection conn) throws SQLException {
        try (Statement stmt = conn.createStatement()) {
            stmt.execute("PRAGMA journal_mode=WAL;");
            stmt.execute("PRAGMA busy_timeout=5000;");
            stmt.execute("PRAGMA synchronous=NORMAL;");
            stmt.execute("PRAGMA foreign_keys=ON;");
        }
    }

    private void runMigrations(Connection conn) throws Exception {
        try (InputStream is = getClass().getResourceAsStream("/db/migration/V1__schema.sql")) {
            if (is == null) {
                throw new IllegalStateException("Arquivo V1__schema.sql não encontrado no classpath");
            }
            String sql = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))
                    .lines()
                    .collect(Collectors.joining("\n"));
            try (Statement stmt = conn.createStatement()) {
                for (String part : sql.split(";")) {
                    String trimmed = part.trim();
                    if (!trimmed.isEmpty()) {
                        stmt.execute(trimmed);
                    }
                }
            }
        }
    }

    public String getStorageDir() {
        return storageDir;
    }

    public String getBackupDir() {
        return backupDir;
    }

    /**
     * Executa backup seguro a quente do SQLite com o comando nativo BACKUP TO.
     */
    public String performSafeOnlineBackup() {
        try {
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            Path target = Paths.get(backupDir, "etec_vagas_backup_" + timestamp + ".db").toAbsolutePath();
            try (Connection conn = getConnection(); Statement stmt = conn.createStatement()) {
                stmt.executeUpdate("VACUUM INTO '" + target.toString().replace("\\", "/") + "'");
            }
            return target.toString();
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    private void seedIfEmpty(Connection conn) throws Exception {
        try (Statement st = conn.createStatement();
             ResultSet rs = st.executeQuery("SELECT COUNT(*) FROM curso")) {
            if (rs.next() && rs.getInt(1) > 0) {
                return;
            }
        }

        String hashPadrao = BcryptUtil.bcryptHash("123456");
        String hoje = LocalDate.now().toString();
        String agora = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));

        conn.setAutoCommit(false);
        try (Statement st = conn.createStatement()) {
            // 1. Configurações do Sistema
            st.executeUpdate("INSERT INTO configuracao (chave, valor, descricao) VALUES " +
                    "('sessao_etec_minutos', '30', 'Tempo máximo de sessão sem uso no painel da ETEC (minutos)')," +
                    "('sessao_geral_minutos', '120', 'Tempo máximo de sessão sem uso nos painéis de Aluno e Empresa (minutos)')," +
                    "('prazo_max_vaga_dias', '60', 'Prazo máximo de inscrição de uma vaga em dias')," +
                    "('idade_minima_estagio', '16', 'Idade mínima exigida pela Lei do Estágio (11.788/2008)')," +
                    "('carga_max_diaria_estagio', '6', 'Jornada diária máxima de estágio nível técnico (horas)')," +
                    "('carga_max_semanal_estagio', '30', 'Jornada semanal máxima de estágio nível técnico (horas)')," +
                    "('dpo_encarregado', 'Encarregado de Dados (DPO) SECITECI/ETEC — dpo@secitec.mt.gov.br | (65) 3613-0100', 'Contato oficial LGPD');");

            // 2. Cursos Técnicos da ETEC Cuiabá
            st.executeUpdate("INSERT INTO curso (id, nome, slug, eixo, duracao_modulos, turno_padrao, ativo) VALUES " +
                    "(1, 'Técnico em Desenvolvimento de Sistemas', 'desenvolvimento-de-sistemas', 'Informação e Comunicação', 3, 'Noite', 1)," +
                    "(2, 'Técnico em Enfermagem', 'enfermagem', 'Ambiente e Saúde', 4, 'Manhã', 1)," +
                    "(3, 'Técnico em Segurança do Trabalho', 'seguranca-do-trabalho', 'Segurança', 3, 'Noite', 1)," +
                    "(4, 'Técnico em Informática', 'informatica', 'Informação e Comunicação', 3, 'Noite', 1)," +
                    "(5, 'Técnico em Agronegócio', 'agronegocio', 'Recursos Naturais', 3, 'Tarde', 1)," +
                    "(6, 'Técnico em Redes de Computadores', 'redes-de-computadores', 'Informação e Comunicação', 3, 'Noite', 1)," +
                    "(7, 'Técnico em Manutenção e Suporte em Informática', 'manutencao-e-suporte-em-informatica', 'Informação e Comunicação', 3, 'Noite', 1)," +
                    "(8, 'Técnico em Agricultura', 'agricultura', 'Recursos Naturais', 3, 'Tarde', 1);");

            // 3. Usuários (Coordenação, Admin TI, Alunos, Egresso, Empresas)
            PreparedStatement psUser = conn.prepareStatement(
                    "INSERT INTO usuario (id, login, email, cpf, nome, senha_hash, perfil, ativo, ultimo_acesso) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)");

            // ID 1: Coordenação de Estágio
            psUser.setInt(1, 1);
            psUser.setString(2, "coordenacao.etec");
            psUser.setString(3, "coordenacao@secitec.mt.gov.br");
            psUser.setString(4, "90010020030");
            psUser.setString(5, "Profa. Márcia Arruda — Coordenação de Estágio ETEC");
            psUser.setString(6, hashPadrao);
            psUser.setString(7, "COORDENACAO");
            psUser.setString(8, agora);
            psUser.executeUpdate();

            // ID 2: Administrador (TI)
            psUser.setInt(1, 2);
            psUser.setString(2, "admin.ti");
            psUser.setString(3, "admin@secitec.mt.gov.br");
            psUser.setString(4, "90010020099");
            psUser.setString(5, "Gabriel Henrique — Administrador TI SECITECI/ETEC");
            psUser.setString(6, hashPadrao);
            psUser.setString(7, "ADMIN");
            psUser.setString(8, agora);
            psUser.executeUpdate();

            // ID 3: Aluno 1 (Desenvolvimento de Sistemas, 2º módulo, maior de idade)
            psUser.setInt(1, 3);
            psUser.setString(2, "aluno.gabriel");
            psUser.setString(3, "aluno@etec.mt.gov.br");
            psUser.setString(4, "11122233344");
            psUser.setString(5, "Pedro Henrique Costa");
            psUser.setString(6, hashPadrao);
            psUser.setString(7, "ALUNO");
            psUser.setString(8, agora);
            psUser.executeUpdate();

            // ID 4: Aluna 2 (Enfermagem, 3º módulo, menor de 18 anos -> 17 anos)
            String dataNascMenor = LocalDate.now().minusYears(17).plusMonths(2).toString();
            psUser.setInt(1, 4);
            psUser.setString(2, "mariana.silva");
            psUser.setString(3, "mariana.silva@aluno.etec.mt.gov.br");
            psUser.setString(4, "22233344455");
            psUser.setString(5, "Mariana Ribeiro da Silva");
            psUser.setString(6, hashPadrao);
            psUser.setString(7, "ALUNO");
            psUser.setString(8, agora);
            psUser.executeUpdate();

            // ID 5: Egresso (Segurança do Trabalho, formado)
            psUser.setInt(1, 5);
            psUser.setString(2, "carlos.egresso");
            psUser.setString(3, "egresso@etec.mt.gov.br");
            psUser.setString(4, "33344455566");
            psUser.setString(5, "Carlos Eduardo Magalhães");
            psUser.setString(6, hashPadrao);
            psUser.setString(7, "EGRESSO");
            psUser.setString(8, agora);
            psUser.executeUpdate();

            // ID 6: Empresa 1 — Cuiabá Digital Sistemas & Cloud Ltda (login: cuiabadigital)
            psUser.setInt(1, 6);
            psUser.setString(2, "cuiabadigital");
            psUser.setString(3, "rh@cuiabadigital.com.br");
            psUser.setString(4, null);
            psUser.setString(5, "Fernanda Lopes (RH Cuiabá Digital)");
            psUser.setString(6, hashPadrao);
            psUser.setString(7, "EMPRESA");
            psUser.setString(8, agora);
            psUser.executeUpdate();

            // ID 7: Empresa 2 — Hospital e Maternidade Santa Helena Cuiabá (login: hospitalsantahelena)
            psUser.setInt(1, 7);
            psUser.setString(2, "hospitalsantahelena");
            psUser.setString(3, "estagios@hospitalsantahelenamt.com.br");
            psUser.setString(4, null);
            psUser.setString(5, "Dr. Roberto Almeida (Gestão de Pessoas)");
            psUser.setString(6, hashPadrao);
            psUser.setString(7, "EMPRESA");
            psUser.setString(8, agora);
            psUser.executeUpdate();

            // ID 8: Empresa 3 — AgroTech Chapada & Pantanal S/A (login: agrochapadamt)
            psUser.setInt(1, 8);
            psUser.setString(2, "agrochapadamt");
            psUser.setString(3, "talentos@agrochapadamt.com.br");
            psUser.setString(4, null);
            psUser.setString(5, "Juliana Mendes (Recrutamento AgroTech)");
            psUser.setString(6, hashPadrao);
            psUser.setString(7, "EMPRESA");
            psUser.setString(8, agora);
            psUser.executeUpdate();

            // ID 9: Empresa 4 — Construtora & Engenharia Pantanal MT (Pendente na fila)
            psUser.setInt(1, 9);
            psUser.setString(2, "construtorapantanal");
            psUser.setString(3, "rh@construtorapantanalmt.com.br");
            psUser.setString(4, null);
            psUser.setString(5, "Eng. Marcos Vinícius Prado");
            psUser.setString(6, hashPadrao);
            psUser.setString(7, "EMPRESA");
            psUser.setString(8, agora);
            psUser.executeUpdate();

            // 4. Alunos e Currículos
            st.executeUpdate("INSERT INTO aluno (id, usuario_id, matricula, curso_id, modulo, turno, data_nasc, egresso, telefone, cidade, alerta_email, alerta_whatsapp, consentimento_lgpd, consentimento_data, responsavel_nome, responsavel_cpf, ciencia_responsavel) VALUES " +
                    "(1, 3, '2026101', 1, 2, 'Noite', '2005-03-20', 0, '(65) 99812-3456', 'Cuiabá/MT', 1, 1, 1, '" + agora + "', NULL, NULL, 0)," +
                    "(2, 4, '2026102', 2, 3, 'Manhã', '" + dataNascMenor + "', 0, '(65) 99654-7890', 'Cuiabá/MT', 1, 1, 1, '" + agora + "', 'Cláudia Ribeiro da Silva (Mãe)', '555.666.777-88', 1)," +
                    "(3, 5, '2024089', 3, 3, 'Noite', '2001-08-12', 1, '(65) 99234-5678', 'Várzea Grande/MT', 1, 0, 1, '" + agora + "', NULL, NULL, 0);");

            st.executeUpdate("INSERT INTO curriculo (aluno_id, resumo, experiencias, formacao, cursos_livres, habilidades, links, pdf_url, pdf_nome, atualizado_em) VALUES " +
                    "(1, 'Estudante do 2º módulo do Técnico em Desenvolvimento de Sistemas na ETEC Cuiabá. Experiência prática em projetos acadêmicos web com Angular, Java, APIs REST e banco de dados SQL.', " +
                    "'Monitor de Laboratório de Informática — ETEC Cuiabá (2026): Apoio aos alunos nas aulas práticas de lógica de programação, manutenção preventiva e configuração de redes locais.', " +
                    "'Curso Técnico em Desenvolvimento de Sistemas — ETEC Cuiabá (Em andamento, 2º módulo, turno Noite) | Ensino Médio Completo — EE Presidente Médici, Cuiabá/MT.', " +
                    "'Git e GitHub Essencial (40h - SENAI MT); Desenvolvimento Web com Angular e TypeScript (60h - Moodle EAD SECITECI); LGPD na Prática para Desenvolvedores (20h - EV.G ENAP).', " +
                    "'Angular, TypeScript, Java, Quarkus, SQLite, HTML5, CSS3, Git, Suporte Técnico, Metodologias Ágeis', " +
                    "'{\"linkedin\":\"https://linkedin.com/in/pedrocosta-etec\",\"github\":\"https://github.com/pedrocosta-etec\",\"portfolio\":\"https://pedrocosta.dev.br\"}', " +
                    "NULL, NULL, '" + agora + "')," +

                    "(2, 'Estudante do 3º módulo do Técnico em Enfermagem na ETEC Cuiabá. Prática supervisionada em biossegurança, triagem, aferição de sinais vitais e atendimento humanizado.', " +
                    "'Estágio Supervisionado Curricular I — Policlínica do Verdão, Cuiabá/MT (120h): Apoio na triagem, organização de prontuários e acompanhamento de procedimentos básicos de enfermagem.', " +
                    "'Curso Técnico em Enfermagem — ETEC Cuiabá (3º módulo, turno Manhã).', " +
                    "'Primeiros Socorros e Suporte Básico de Vida (30h - Cruz Vermelha MT); Biossegurança e Controle de Infecção Hospitalar (40h - UNA-SUS).', " +
                    "'Triagem Clínica, Sinais Vitais, Biossegurança, Atendimento Humanizado, Primeiros Socorros, Prontuário Eletrônico', " +
                    "'{\"linkedin\":\"https://linkedin.com/in/marianasilva-enf\",\"github\":\"\",\"portfolio\":\"\"}', " +
                    "NULL, NULL, '" + agora + "')," +

                    "(3, 'Técnico em Segurança do Trabalho formado pela ETEC Cuiabá (Egresso). Experiência na aplicação de NRs (NR-06, NR-10, NR-12, NR-35), inspeções de campo, PGR, PCMSO e treinamentos de CIPA.', " +
                    "'Auxiliar de Segurança do Trabalho — Logística Centro-Oeste Ltda (2025-2026): Controle e entrega de EPIs, DDS diário, acompanhamento de brigada de incêndio e relatórios de conformidade.', " +
                    "'Técnico em Segurança do Trabalho — ETEC Cuiabá (Concluído, carga horária 1.200h).', " +
                    "'NR-35 Trabalho em Altura (16h); Brigada de Incêndio e Emergência (24h - CBM-MT); eSocial para SST (30h).', " +
                    "'Normas Regulamentadoras (NRs), PGR e PCMSO, Gestão de EPIs, Treinamento CIPA, Inspeção de Segurança, eSocial SST', " +
                    "'{\"linkedin\":\"https://linkedin.com/in/carlosmagalhaes-tst\",\"github\":\"\",\"portfolio\":\"\"}', " +
                    "NULL, NULL, '" + agora + "');");

            // 5. Base da Secretaria (para demonstrar Primeiro Acesso do Aluno e Importação)
            st.executeUpdate("INSERT INTO secretaria_base_aluno (matricula, cpf, nome, email_secretaria, curso_id, modulo, turno, data_nasc, egresso, telefone, conta_ativada) VALUES " +
                    "('2026101', '11122233344', 'Pedro Henrique Costa', 'aluno@etec.mt.gov.br', 1, 2, 'Noite', '2005-03-20', 0, '(65) 99812-3456', 1)," +
                    "('2026102', '22233344455', 'Mariana Ribeiro da Silva', 'mariana.silva@aluno.etec.mt.gov.br', 2, 3, 'Manhã', '" + dataNascMenor + "', 0, '(65) 99654-7890', 1)," +
                    "('2024089', '33344455566', 'Carlos Eduardo Magalhães', 'egresso@etec.mt.gov.br', 3, 3, 'Noite', '2001-08-12', 1, '(65) 99234-5678', 1)," +
                    "('2026205', '44455566677', 'Lucas Oliveira Santos', 'lucas.santos@aluno.etec.mt.gov.br', 5, 2, 'Tarde', '2006-11-05', 0, '(65) 99111-2233', 0)," +
                    "('2026206', '55566677788', 'Beatriz Arruda Campos', 'beatriz.campos@aluno.etec.mt.gov.br', 4, 2, 'Noite', '2007-02-19', 0, '(65) 99333-4455', 0)," +
                    "('2025118', '66677788899', 'Rafael Souza Figueiredo', 'rafael.figueiredo@aluno.etec.mt.gov.br', 6, 3, 'Noite', '2004-07-30', 0, '(65) 99444-5566', 0);");

            // 6. Empresas Parceiras
            st.executeUpdate("INSERT INTO empresa (id, cnpj, razao_social, nome_fantasia, setor, endereco, cidade, telefone, email_contato, responsavel, status, motivo_recusa, criado_em) VALUES " +
                    "(1, '28.901.234/0001-89', 'Cuiabá Digital Sistemas e Cloud Ltda', 'Cuiabá Digital Tech', 'Tecnologia da Informação', 'Av. Historiador Rubens de Mendonça (Av. do CPA), 2368, Bosque da Saúde', 'Cuiabá/MT', '(65) 3028-4500', 'rh@cuiabadigital.com.br', 'Fernanda Lopes', 'aprovada', NULL, '" + agora + "')," +
                    "(2, '03.456.789/0001-12', 'Hospital e Maternidade Santa Helena de Cuiabá S/A', 'Hospital Santa Helena', 'Saúde e Atendimento Hospitalar', 'Av. São Sebastião, 2900, Quilombo', 'Cuiabá/MT', '(65) 3615-7000', 'estagios@hospitalsantahelenamt.com.br', 'Dr. Roberto Almeida', 'aprovada', NULL, '" + agora + "')," +
                    "(3, '14.789.123/0001-45', 'AgroTech Chapada e Pantanal Insumos e Telemetria S/A', 'AgroTech Chapada MT', 'Agronegócio e Recursos Naturais', 'Rodovia Palmiro Paes de Barros, Km 12, Distrito Industrial', 'Cuiabá/MT', '(65) 3667-8900', 'talentos@agrochapadamt.com.br', 'Juliana Mendes', 'aprovada', NULL, '" + agora + "')," +
                    "(4, '39.112.334/0001-01', 'Construtora e Engenharia Pantanal Mato Grosso Ltda', 'Construtora Pantanal MT', 'Construção Civil e Segurança', 'Av. Miguel Sutil, 8450, Santa Rosa', 'Cuiabá/MT', '(65) 3322-9100', 'rh@construtorapantanalmt.com.br', 'Eng. Marcos Vinícius Prado', 'pendente', NULL, '" + agora + "');");

            st.executeUpdate("INSERT INTO empresa_usuario (empresa_id, usuario_id, cargo) VALUES " +
                    "(1, 6, 'Analista de Recursos Humanos / Tech Recruiter')," +
                    "(2, 7, 'Coordenador de Gestão de Pessoas e Ensino')," +
                    "(3, 8, 'Especialista em Atração de Talentos')," +
                    "(4, 9, 'Engenheiro Responsável / Diretor Técnico');");

            // 7. Vagas (Publicadas, Aguardando aprovação, Ajuste solicitado)
            String prazo5Dias = LocalDate.now().plusDays(5).toString();
            String prazo18Dias = LocalDate.now().plusDays(18).toString();
            String prazo25Dias = LocalDate.now().plusDays(25).toString();
            String prazo35Dias = LocalDate.now().plusDays(35).toString();
            String prazo42Dias = LocalDate.now().plusDays(42).toString();
            String criadoHoje = LocalDate.now().toString();
            String criadoOntem = LocalDate.now().minusDays(1).toString();
            String criado3Dias = LocalDate.now().minusDays(3).toString();

            // Vaga 1: Estágio em Desenvolvimento Front-end Angular & Java (Publicada, Nova, Destaque)
            st.executeUpdate("INSERT INTO vaga (id, empresa_id, tipo, titulo, atividades, requisitos, bolsa, valor_numerico, beneficios, carga_horaria, horas_dia, horas_semana, turno, modalidade, local, cidade, qtd_vagas, prazo, forma_candidatura, contato_externo, status, motivo_ajuste, confidencial, destaque, criado_em, publicado_em, aprovado_em) VALUES " +
                    "(1, 1, 'Estágio não obrigatório', 'Estagiário(a) de Desenvolvimento Web (Angular / Java)', " +
                    "'Apoiar o time de engenharia de software na manutenção de telas responsivas em Angular, consumo de APIs REST em Java/Quarkus, execução de testes funcionais e documentação técnica de sistemas corporativos.', " +
                    "'Estar regularmente matriculado a partir do 2º módulo do curso Técnico em Desenvolvimento de Sistemas da ETEC Cuiabá; noções de HTML, CSS, TypeScript/JavaScript e lógica de programação; disponibilidade no período vespertino.', " +
                    "'R$ 1.250,00', 1250.0, 'Auxílio-transporte (R$ 220,00/mês), Seguro de Vida obrigatório (Lei 11.788/2008), Vale-lanche e Day-off no aniversário', " +
                    "'6h/dia, 30h/semana', 6, 30, 'Tarde', 'Híbrido', 'Av. do CPA, Bosque da Saúde', 'Cuiabá/MT', 2, '" + prazo25Dias + "', 'Pelo sistema', NULL, 'publicada', NULL, 0, 1, '" + criadoHoje + "', '" + criadoHoje + "', '" + criadoHoje + "');");

            // Vaga 2: Estágio Técnico em Enfermagem (Publicada, Encerra em 5 dias, Destaque)
            st.executeUpdate("INSERT INTO vaga (id, empresa_id, tipo, titulo, atividades, requisitos, bolsa, valor_numerico, beneficios, carga_horaria, horas_dia, horas_semana, turno, modalidade, local, cidade, qtd_vagas, prazo, forma_candidatura, contato_externo, status, motivo_ajuste, confidencial, destaque, criado_em, publicado_em, aprovado_em) VALUES " +
                    "(2, 2, 'Estágio não obrigatório', 'Estágio Técnico em Enfermagem — Triagem e Ambulatório', " +
                    "'Auxílio supervisionado na triagem de pacientes, aferição e registro de sinais vitais no prontuário eletrônico, organização de materiais de enfermagem e apoio à equipe multiprofissional seguindo protocolos de biossegurança.', " +
                    "'Matrícula ativa a partir do 2º módulo do Técnico em Enfermagem da ETEC Cuiabá; disponibilidade no turno vespertino; postura ética, empatia e atenção às normas de biossegurança hospitalar.', " +
                    "'R$ 1.100,00', 1100.0, 'Auxílio-transporte integral, Refeitório no local, Seguro contra acidentes pessoais', " +
                    "'6h/dia, 30h/semana', 6, 30, 'Tarde', 'Presencial', 'Bairro Quilombo — Av. São Sebastião', 'Cuiabá/MT', 3, '" + prazo5Dias + "', 'Pelo sistema', NULL, 'publicada', NULL, 0, 1, '" + criado3Dias + "', '" + criado3Dias + "', '" + criado3Dias + "');");

            // Vaga 3: Técnico em Segurança do Trabalho Jr — CLT (Publicada, aberta também para Egressos!)
            st.executeUpdate("INSERT INTO vaga (id, empresa_id, tipo, titulo, atividades, requisitos, bolsa, valor_numerico, beneficios, carga_horaria, horas_dia, horas_semana, turno, modalidade, local, cidade, qtd_vagas, prazo, forma_candidatura, contato_externo, status, motivo_ajuste, confidencial, destaque, criado_em, publicado_em, aprovado_em) VALUES " +
                    "(3, 3, 'CLT', 'Técnico(a) em Segurança do Trabalho Júnior', " +
                    "'Realizar inspeções diárias de segurança nas unidades operacionais, ministrar Diálogos Diários de Segurança (DDS), controlar entrega e validade de EPIs, acompanhar programas PGR e PCMSO e apoiar treinamentos das NRs.', " +
                    "'Curso Técnico em Segurança do Trabalho concluído (Egresso ETEC Cuiabá) ou cursando o último módulo (3º módulo noturno); conhecimento do pacote Office e eventos de SST no eSocial.', " +
                    "'R$ 3.200,00', 3200.0, 'Vale-transporte, Vale-alimentação (R$ 750,00), Plano de Saúde e Odontológico, Seguro de Vida', " +
                    "'8h/dia, 44h/semana', 8, 44, 'Integral', 'Presencial', 'Distrito Industrial de Cuiabá', 'Cuiabá/MT', 1, '" + prazo18Dias + "', 'Pelo sistema', NULL, 'publicada', NULL, 0, 1, '" + criadoOntem + "', '" + criadoOntem + "', '" + criadoOntem + "');");

            // Vaga 4: Estágio em Suporte de Redes e Infraestrutura (Publicada, Confidencial = 1)
            st.executeUpdate("INSERT INTO vaga (id, empresa_id, tipo, titulo, atividades, requisitos, bolsa, valor_numerico, beneficios, carga_horaria, horas_dia, horas_semana, turno, modalidade, local, cidade, qtd_vagas, prazo, forma_candidatura, contato_externo, status, motivo_ajuste, confidencial, destaque, criado_em, publicado_em, aprovado_em) VALUES " +
                    "(4, 1, 'Estágio obrigatório', 'Estagiário(a) de Redes e Suporte Técnico N1', " +
                    "'Atendimento de chamados de suporte nível 1, cabeamento estruturado, configuração básica de switches/roteadores, inventário de ativos de TI e apoio na rotina de backup.', " +
                    "'Matrícula ativa no curso Técnico em Redes de Computadores ou Técnico em Desenvolvimento de Sistemas (a partir do 1º módulo); disponibilidade pela manhã.', " +
                    "'R$ 950,00', 950.0, 'Auxílio-transporte, Seguro de Vida escolar/empresarial e Mentoria técnica', " +
                    "'4h/dia, 20h/semana', 4, 20, 'Manhã', 'Presencial', 'Centro Político Administrativo (CPA)', 'Cuiabá/MT', 2, '" + prazo35Dias + "', 'Pelo sistema', NULL, 'publicada', NULL, 1, 0, '" + criadoHoje + "', '" + criadoHoje + "', '" + criadoHoje + "');");

            // Vaga 5: Jovem Aprendiz em Suporte de Informática (Publicada)
            st.executeUpdate("INSERT INTO vaga (id, empresa_id, tipo, titulo, atividades, requisitos, bolsa, valor_numerico, beneficios, carga_horaria, horas_dia, horas_semana, turno, modalidade, local, cidade, qtd_vagas, prazo, forma_candidatura, contato_externo, status, motivo_ajuste, confidencial, destaque, criado_em, publicado_em, aprovado_em) VALUES " +
                    "(5, 3, 'Jovem aprendiz', '" + CursosOficiais.VAGA5_TITULO + "', " +
                    "'" + CursosOficiais.VAGA5_ATIVIDADES + "', " +
                    "'" + CursosOficiais.VAGA5_REQUISITOS + "', " +
                    "'R$ 1.050,00', 1050.0, 'Vale-transporte, Vale-refeição, Seguro de Vida e Curso de Formação Profissional', " +
                    "'4h/dia, 20h/semana', 4, 20, 'Manhã', 'Presencial', 'Distrito Industrial / Porto', 'Cuiabá/MT', 2, '" + prazo42Dias + "', 'Pelo sistema', NULL, 'publicada', NULL, 0, 1, '" + criadoHoje + "', '" + criadoHoje + "', '" + criadoHoje + "');");

            // Vaga 6: Estágio Técnico em Agronegócio (Publicada)
            st.executeUpdate("INSERT INTO vaga (id, empresa_id, tipo, titulo, atividades, requisitos, bolsa, valor_numerico, beneficios, carga_horaria, horas_dia, horas_semana, turno, modalidade, local, cidade, qtd_vagas, prazo, forma_candidatura, contato_externo, status, motivo_ajuste, confidencial, destaque, criado_em, publicado_em, aprovado_em) VALUES " +
                    "(6, 3, 'Estágio não obrigatório', 'Estágio Técnico em Agronegócio e Agricultura Digital', " +
                    "'Apoio no monitoramento de indicadores de safra, análise de dados de telemetria agrícola, elaboração de laudos técnicos de qualidade de grãos e atendimento a produtores parceiros.', " +
                    "'Cursando Técnico em Agronegócio na ETEC Cuiabá a partir do 2º módulo; facilidade com planilhas e ferramentas digitais.', " +
                    "'R$ 1.300,00', 1300.0, 'Auxílio-transporte, Refeição na empresa e Seguro de Vida', " +
                    "'6h/dia, 30h/semana', 6, 30, 'Manhã', 'Presencial', 'Distrito Industrial, Cuiabá', 'Cuiabá/MT', 2, '" + prazo25Dias + "', 'Pelo sistema', NULL, 'publicada', NULL, 0, 0, '" + criadoOntem + "', '" + criadoOntem + "', '" + criadoOntem + "');");

            // Vaga 7: AGUARDANDO APROVAÇÃO na fila da Coordenação ETEC
            st.executeUpdate("INSERT INTO vaga (id, empresa_id, tipo, titulo, atividades, requisitos, bolsa, valor_numerico, beneficios, carga_horaria, horas_dia, horas_semana, turno, modalidade, local, cidade, qtd_vagas, prazo, forma_candidatura, contato_externo, status, motivo_ajuste, confidencial, destaque, criado_em) VALUES " +
                    "(7, 1, 'Estágio não obrigatório', 'Estagiário(a) de QA e Testes Automatizados', " +
                    "'Apoiar na escrita de roteiros de teste, execução de testes de regressão em aplicações web e registro de bugs junto ao time de desenvolvimento.', " +
                    "'Cursando Técnico em Desenvolvimento de Sistemas (a partir do 2º módulo); atenção a detalhes e raciocínio lógico.', " +
                    "'R$ 1.200,00', 1200.0, 'Auxílio-transporte (R$ 220,00) e Seguro de Vida', " +
                    "'6h/dia, 30h/semana', 6, 30, 'Manhã', 'Híbrido', 'Bosque da Saúde, Cuiabá', 'Cuiabá/MT', 1, '" + prazo35Dias + "', 'Pelo sistema', NULL, 'aguardando_aprovacao', NULL, 0, 0, '" + criadoHoje + "');");

            // Vaga 8: AGUARDANDO APROVAÇÃO na fila da Coordenação ETEC (Hospital Santa Helena)
            st.executeUpdate("INSERT INTO vaga (id, empresa_id, tipo, titulo, atividades, requisitos, bolsa, valor_numerico, beneficios, carga_horaria, horas_dia, horas_semana, turno, modalidade, local, cidade, qtd_vagas, prazo, forma_candidatura, contato_externo, status, motivo_ajuste, confidencial, destaque, criado_em) VALUES " +
                    "(8, 2, 'Estágio não obrigatório', '" + CursosOficiais.VAGA8_TITULO + "', " +
                    "'" + CursosOficiais.VAGA8_ATIVIDADES + "', " +
                    "'" + CursosOficiais.VAGA8_REQUISITOS + "', " +
                    "'R$ 850,00', 850.0, 'Auxílio-transporte e Seguro de Vida obrigatório', " +
                    "'5h/dia, 25h/semana', 5, 25, 'Manhã', 'Presencial', 'Bairro Quilombo, Cuiabá', 'Cuiabá/MT', 2, '" + prazo35Dias + "', 'Pelo sistema', NULL, 'aguardando_aprovacao', NULL, 0, 0, '" + criadoHoje + "');");

            // Vaga 9: AJUSTE SOLICITADO pela Coordenação (para demonstrar o fluxo no painel da empresa)
            st.executeUpdate("INSERT INTO vaga (id, empresa_id, tipo, titulo, atividades, requisitos, bolsa, valor_numerico, beneficios, carga_horaria, horas_dia, horas_semana, turno, modalidade, local, cidade, qtd_vagas, prazo, forma_candidatura, contato_externo, status, motivo_ajuste, confidencial, destaque, criado_em) VALUES " +
                    "(9, 1, 'Estágio não obrigatório', 'Estágio em Banco de Dados e BI', " +
                    "'Criação de consultas SQL, apoio em relatórios gerenciais e modelagem de dados.', " +
                    "'Cursando Técnico em Desenvolvimento de Sistemas.', " +
                    "'R$ 1.150,00', 1150.0, 'Auxílio-transporte e Seguro de Vida', " +
                    "'6h/dia, 30h/semana', 6, 30, 'Tarde', 'Presencial', 'Av. do CPA, Cuiabá', 'Cuiabá/MT', 1, '" + prazo25Dias + "', 'Pelo sistema', NULL, 'ajuste_solicitado', 'Favor detalhar no campo de atividades quais ferramentas de BI serão utilizadas pelo estagiário e confirmar o supervisor técnico da área de dados.', 0, 0, '" + criadoOntem + "');");

            // 8. Vínculo Vaga <-> Cursos (vaga_curso)
            st.executeUpdate("INSERT INTO vaga_curso (vaga_id, curso_id, modulo_minimo) VALUES " +
                    "(1, 1, 2)," + // Vaga 1 -> Desenvolvimento de Sistemas (mód 2)
                    "(2, 2, 2)," + // Vaga 2 -> Enfermagem (mód 2)
                    "(3, 3, 3)," + // Vaga 3 -> Segurança do Trabalho (mód 3 / egresso)
                    "(4, 6, 1), (4, 1, 1)," + // Vaga 4 -> Redes e Desenvolvimento de Sistemas
                    "(5, 4, 1), (5, 7, 1)," + // Vaga 5 -> Informática e Manutenção e Suporte em Informática
                    "(6, 5, 2)," + // Vaga 6 -> Agronegócio (mód 2)
                    "(7, 1, 2)," + // Vaga 7 -> Desenvolvimento de Sistemas
                    "(8, 7, 2), (8, 4, 2), (6, 8, 2)," + // Vaga 8 -> Manutenção/Informática; Vaga 6 -> também Agricultura
                    "(9, 1, 2);"); // Vaga 9 -> Desenvolvimento de Sistemas

            // 9. Candidaturas e Histórico de Status
            // Candidatura 1: Pedro (Aluno 1) na Vaga 1 -> Status: entrevista
            st.executeUpdate("INSERT INTO candidatura (id, vaga_id, aluno_id, data, status, carta, observacao_empresa, contratado) VALUES " +
                    "(1, 1, 1, '" + criadoOntem + " 14:20:00', 'entrevista', 'Tenho grande interesse na vaga de Estágio em Angular e Java. Já desenvolvi projetos práticos com essas tecnologias no laboratório da ETEC Cuiabá.', 'Excelente perfil técnico. Entrevista técnica agendada para quinta-feira às 15h.', 0)," +
                    // Candidatura 2: Mariana (Aluna 2 - menor de 18) na Vaga 2 -> Status: aprovado (gera Termo de Estágio com assinatura de responsável!)
                    "(2, 2, 2, '" + criado3Dias + " 10:15:00', 'aprovado', 'Sou aluna do 3º módulo de Enfermagem da ETEC Cuiabá e concluí meu estágio supervisionado I com nota máxima em biossegurança e triagem.', 'Aprovada na seleção! Encaminhado para emissão do Termo de Compromisso junto à Coordenação da ETEC.', 1)," +
                    // Candidatura 3: Carlos (Egresso) na Vaga 3 (CLT) -> Status: aprovado / contratado
                    "(3, 3, 3, '" + criadoOntem + " 09:40:00', 'aprovado', 'Sou Técnico em Segurança do Trabalho formado pela ETEC Cuiabá, com experiência prática em NRs, PGR e eSocial SST.', 'Contratado em regime CLT! Início imediato.', 1);");

            st.executeUpdate("INSERT INTO historico_status (candidatura_id, status, data, usuario_id, observacao) VALUES " +
                    "(1, 'enviada', '" + criadoOntem + " 14:20:00', 3, 'Candidatura enviada com currículo salvo pelo aluno.')," +
                    "(1, 'em_analise', '" + criadoOntem + " 16:05:00', 6, 'Currículo em análise pelo RH da Cuiabá Digital.')," +
                    "(1, 'entrevista', '" + hoje + " 09:00:00', 6, 'Selecionado para entrevista técnica.')," +
                    "(2, 'enviada', '" + criado3Dias + " 10:15:00', 4, 'Candidatura enviada com ciência do responsável legal (aluna menor de 18 anos).')," +
                    "(2, 'em_analise', '" + criado3Dias + " 15:00:00', 7, 'Em avaliação pela Coordenação de Enfermagem do Hospital Santa Helena.')," +
                    "(2, 'entrevista', '" + criadoOntem + " 11:00:00', 7, 'Entrevista presencial realizada no Hospital Santa Helena.')," +
                    "(2, 'aprovado', '" + hoje + " 08:30:00', 7, 'Candidata aprovada para início do estágio supervisionado.')," +
                    "(3, 'enviada', '" + criadoOntem + " 09:40:00', 5, 'Candidatura enviada por egresso da ETEC Cuiabá.')," +
                    "(3, 'aprovado', '" + hoje + " 10:00:00', 8, 'Aprovado e contratado como Técnico em Segurança do Trabalho Jr (CLT).');");

            // 10. Estágio Ativo / Termo de Compromisso (ligado à Candidatura 2 da aluna Mariana, menor de 18 anos)
            String inicioEstagio = LocalDate.now().plusDays(3).toString();
            String fimEstagio = LocalDate.now().plusMonths(6).plusDays(3).toString();
            String relatorioSemestral = LocalDate.now().plusMonths(6).toString();
            st.executeUpdate("INSERT INTO estagio (id, candidatura_id, data_inicio, data_fim, supervisor_nome, supervisor_cargo, termo_pdf, assinaturas, relatorio_semestral_data, relatorio_semestral_status, situacao, criado_em) VALUES " +
                    "(1, 2, '" + inicioEstagio + "', '" + fimEstagio + "', 'Enfª. Patrícia Vasconcelos (COREN-MT 145.890)', 'Coordenadora de Enfermagem Ambulatorial', 'termo_estagio_1.pdf', " +
                    "'{\"aluno\":true,\"responsavel\":true,\"empresa\":true,\"etec\":true}', '" + relatorioSemestral + "', 'em_dia', 'ativo', '" + agora + "');");

            // 11. Vagas Salvas pelo Aluno 1
            st.executeUpdate("INSERT INTO vaga_salva (aluno_id, vaga_id, data) VALUES " +
                    "(1, 1, '" + agora + "')," +
                    "(1, 4, '" + agora + "');");

            // 12. Notificações Iniciais
            st.executeUpdate("INSERT INTO notificacao (usuario_id, canal, titulo, mensagem, lida, data) VALUES " +
                    "(3, 'SISTEMA_EMAIL', 'Sua candidatura avançou para Entrevista!', 'A empresa Cuiabá Digital Tech atualizou o status da sua candidatura na vaga Estagiário(a) de Desenvolvimento Web (Angular / Java) para ENTREVISTA.', 0, '" + agora + "')," +
                    "(3, 'SISTEMA_EMAIL', 'Nova vaga compatível com seu curso', 'Uma nova vaga de Estagiário(a) de Redes e Suporte Técnico N1 foi aprovada pela Coordenação da ETEC para o curso Técnico em Desenvolvimento de Sistemas.', 0, '" + agora + "')," +
                    "(4, 'SISTEMA_EMAIL', 'Parabéns! Você foi aprovada para o estágio', 'O Hospital Santa Helena aprovou sua candidatura! O Termo de Compromisso de Estágio já está disponível para download em PDF.', 0, '" + agora + "')," +
                    "(6, 'SISTEMA_EMAIL', 'Vaga publicada pela Coordenação ETEC', 'Sua vaga Estagiário(a) de Desenvolvimento Web (Angular / Java) foi aprovada pela Coordenação de Estágio e já está visível no portal.', 0, '" + agora + "')," +
                    "(1, 'SISTEMA_EMAIL', 'Fila de moderação: 1 empresa e 2 vagas aguardando', 'Há 1 nova empresa (Construtora Pantanal MT) e 2 vagas aguardando aprovação na fila da Coordenação de Estágio.', 0, '" + agora + "');");

            // 13. Denúncia de exemplo para a fila da Coordenação
            st.executeUpdate("INSERT INTO denuncia (vaga_id, motivo, descricao, denunciante_nome, denunciante_contato, situacao, parecer_etec, data) VALUES " +
                    "(4, 'Dúvida sobre empresa confidencial', 'Gostaria que a Coordenação confirmasse se a empresa confidencial da vaga #4 possui convênio ativo com a ETEC Cuiabá.', 'Aluno do 2º módulo de Redes', 'aluno.redes@etec.mt.gov.br', 'pendente', NULL, '" + agora + "');");

            // 14. Logs de Auditoria Iniciais (LGPD)
            st.executeUpdate("INSERT INTO log_auditoria (usuario_id, usuario_nome, perfil, acao, alvo, data, ip) VALUES " +
                    "(1, 'Profa. Márcia Arruda — Coordenação de Estágio ETEC', 'COORDENACAO', 'APROVACAO_EMPRESA', 'Empresa #1: Cuiabá Digital Tech (CNPJ 28.901.234/0001-89)', '" + agora + "', '10.20.0.14')," +
                    "(1, 'Profa. Márcia Arruda — Coordenação de Estágio ETEC', 'COORDENACAO', 'APROVACAO_VAGA', 'Vaga #1: Estagiário(a) de Desenvolvimento Web (Angular / Java)', '" + agora + "', '10.20.0.14')," +
                    "(6, 'Fernanda Lopes (RH Cuiabá Digital)', 'EMPRESA', 'ACESSO_CURRICULO_CANDIDATO_LGPD', 'Visualizou currículo do candidato Pedro Henrique Costa na Vaga #1 (CPF ocultado conforme LGPD)', '" + agora + "', '177.85.42.19')," +
                    "(1, 'Profa. Márcia Arruda — Coordenação de Estágio ETEC', 'COORDENACAO', 'EMISSAO_TERMO_ESTAGIO_PDF', 'Gerou Termo de Compromisso de Estágio #1 para aluna Mariana Ribeiro da Silva (menor de 18 anos - com assinatura do responsável)', '" + agora + "', '10.20.0.14');");

            conn.commit();
        } catch (Exception e) {
            conn.rollback();
            throw e;
        } finally {
            conn.setAutoCommit(true);
        }
    }
}
