-- ============================================================================
-- V1__schema.sql — Modelo de Dados do Portal de Vagas ETEC Cuiabá (SQLite)
-- 13 Tabelas Principais + Tabelas Auxiliares de Notificações, Vagas Salvas e Config
-- ============================================================================

-- 1. CURSO (Cursos técnicos da ETEC Cuiabá)
CREATE TABLE IF NOT EXISTS curso (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    eixo TEXT NOT NULL,
    duracao_modulos INTEGER NOT NULL DEFAULT 3,
    turno_padrao TEXT NOT NULL DEFAULT 'Noite',
    ativo INTEGER NOT NULL DEFAULT 1
);

-- 2. USUARIO (Unificado: ALUNO, EGRESSO, EMPRESA, COORDENACAO, ADMIN)
CREATE TABLE IF NOT EXISTS usuario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    login TEXT UNIQUE,
    email TEXT UNIQUE,
    cpf TEXT UNIQUE,
    nome TEXT NOT NULL,
    senha_hash TEXT NOT NULL,
    perfil TEXT NOT NULL, -- ALUNO, EGRESSO, EMPRESA, COORDENACAO, ADMIN
    ativo INTEGER NOT NULL DEFAULT 1,
    ultimo_acesso TEXT,
    tentativas_falhas INTEGER NOT NULL DEFAULT 0,
    bloqueado_ate TEXT
);

-- 3. ALUNO (Dados acadêmicos vindos da secretaria + LGPD)
CREATE TABLE IF NOT EXISTS aluno (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL UNIQUE,
    matricula TEXT NOT NULL UNIQUE,
    curso_id INTEGER NOT NULL,
    modulo INTEGER NOT NULL DEFAULT 1,
    turno TEXT NOT NULL DEFAULT 'Manhã',
    data_nasc TEXT NOT NULL, -- YYYY-MM-DD (para cálculo de menor de 18 e mínimo 16 anos)
    egresso INTEGER NOT NULL DEFAULT 0, -- 0 = Aluno ativo, 1 = Egresso (formado)
    telefone TEXT,
    cidade TEXT DEFAULT 'Cuiabá/MT',
    alerta_email INTEGER NOT NULL DEFAULT 1,
    alerta_whatsapp INTEGER NOT NULL DEFAULT 0,
    consentimento_lgpd INTEGER NOT NULL DEFAULT 0,
    consentimento_data TEXT,
    responsavel_nome TEXT,
    responsavel_cpf TEXT,
    ciencia_responsavel INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE,
    FOREIGN KEY (curso_id) REFERENCES curso(id)
);

-- 4. CURRICULO (Currículo estruturado do aluno + PDF fora da pasta pública)
CREATE TABLE IF NOT EXISTS curriculo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    aluno_id INTEGER NOT NULL UNIQUE,
    resumo TEXT,
    experiencias TEXT, -- JSON ou texto estruturado
    formacao TEXT,
    cursos_livres TEXT,
    habilidades TEXT,
    links TEXT, -- JSON com linkedin, github, portfolio
    pdf_url TEXT,
    pdf_nome TEXT,
    atualizado_em TEXT,
    FOREIGN KEY (aluno_id) REFERENCES aluno(id) ON DELETE CASCADE
);

-- 5. EMPRESA (Empresas parceiras de Cuiabá e região)
CREATE TABLE IF NOT EXISTS empresa (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cnpj TEXT NOT NULL UNIQUE,
    razao_social TEXT NOT NULL,
    nome_fantasia TEXT NOT NULL,
    setor TEXT NOT NULL DEFAULT 'Tecnologia e Serviços',
    endereco TEXT NOT NULL,
    cidade TEXT NOT NULL DEFAULT 'Cuiabá/MT',
    telefone TEXT NOT NULL,
    email_contato TEXT NOT NULL,
    responsavel TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente', -- pendente, aprovada, bloqueada, recusada
    motivo_recusa TEXT,
    aceite_termos INTEGER NOT NULL DEFAULT 1,
    criado_em TEXT NOT NULL
);

-- 6. EMPRESA_USUARIO (Vínculo de recrutadores com a empresa)
CREATE TABLE IF NOT EXISTS empresa_usuario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL UNIQUE,
    cargo TEXT NOT NULL DEFAULT 'Recrutador / RH',
    FOREIGN KEY (empresa_id) REFERENCES empresa(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE
);

-- 7. VAGA (15 campos obrigatórios + status de moderação e Lei do Estágio)
CREATE TABLE IF NOT EXISTS vaga (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER NOT NULL,
    tipo TEXT NOT NULL, -- Estágio obrigatório, Estágio não obrigatório, CLT, Jovem aprendiz, Temporário
    titulo TEXT NOT NULL,
    atividades TEXT NOT NULL,
    requisitos TEXT NOT NULL,
    bolsa TEXT NOT NULL, -- ex: R$ 950,00 ou "A combinar" (só em CLT)
    valor_numerico REAL DEFAULT 0,
    beneficios TEXT NOT NULL, -- Obrigatório conter Auxílio-transporte no estágio não obrigatório
    carga_horaria TEXT NOT NULL, -- ex: 6h/dia, 30h/semana
    horas_dia INTEGER NOT NULL DEFAULT 6,
    horas_semana INTEGER NOT NULL DEFAULT 30,
    turno TEXT NOT NULL, -- Manhã, Tarde, Noite, Integral
    modalidade TEXT NOT NULL DEFAULT 'Presencial', -- Presencial, Híbrido, Remoto
    local TEXT NOT NULL, -- Bairro / Endereço
    cidade TEXT NOT NULL DEFAULT 'Cuiabá/MT',
    qtd_vagas INTEGER NOT NULL DEFAULT 1,
    prazo TEXT NOT NULL, -- YYYY-MM-DD (máx 60 dias)
    forma_candidatura TEXT NOT NULL DEFAULT 'Pelo sistema', -- Pelo sistema, Link externo, E-mail externo
    contato_externo TEXT,
    status TEXT NOT NULL DEFAULT 'aguardando_aprovacao', -- rascunho, aguardando_aprovacao, publicada, ajuste_solicitado, recusada, encerrada
    motivo_ajuste TEXT,
    confidencial INTEGER NOT NULL DEFAULT 0,
    destaque INTEGER NOT NULL DEFAULT 0,
    criado_em TEXT NOT NULL,
    publicado_em TEXT,
    aprovado_em TEXT,
    encerrado_em TEXT,
    FOREIGN KEY (empresa_id) REFERENCES empresa(id) ON DELETE CASCADE
);

-- 8. VAGA_CURSO (Ligação N:N entre Vaga e Cursos Técnicos com módulo mínimo)
CREATE TABLE IF NOT EXISTS vaga_curso (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vaga_id INTEGER NOT NULL,
    curso_id INTEGER NOT NULL,
    modulo_minimo INTEGER NOT NULL DEFAULT 1,
    UNIQUE(vaga_id, curso_id),
    FOREIGN KEY (vaga_id) REFERENCES vaga(id) ON DELETE CASCADE,
    FOREIGN KEY (curso_id) REFERENCES curso(id) ON DELETE CASCADE
);

-- 9. CANDIDATURA (Centro do modelo: liga um aluno a uma vaga)
CREATE TABLE IF NOT EXISTS candidatura (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vaga_id INTEGER NOT NULL,
    aluno_id INTEGER NOT NULL,
    data TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'enviada', -- enviada, em_analise, entrevista, aprovado, nao_selecionado, desistiu
    carta TEXT,
    observacao_empresa TEXT,
    contratado INTEGER NOT NULL DEFAULT 0,
    UNIQUE(vaga_id, aluno_id),
    FOREIGN KEY (vaga_id) REFERENCES vaga(id) ON DELETE CASCADE,
    FOREIGN KEY (aluno_id) REFERENCES aluno(id) ON DELETE CASCADE
);

-- 10. HISTORICO_STATUS (Linha do tempo de cada mudança de status da candidatura)
CREATE TABLE IF NOT EXISTS historico_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidatura_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    data TEXT NOT NULL,
    usuario_id INTEGER,
    observacao TEXT,
    FOREIGN KEY (candidatura_id) REFERENCES candidatura(id) ON DELETE CASCADE
);

-- 11. ESTAGIO (Gestão do Termo de Compromisso, assinaturas e relatórios semestrais)
CREATE TABLE IF NOT EXISTS estagio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidatura_id INTEGER NOT NULL UNIQUE,
    data_inicio TEXT NOT NULL,
    data_fim TEXT NOT NULL,
    supervisor_nome TEXT NOT NULL DEFAULT 'Supervisor Técnico',
    supervisor_cargo TEXT NOT NULL DEFAULT 'Coordenador de Área',
    termo_pdf TEXT,
    assinaturas TEXT NOT NULL DEFAULT '{"aluno":false,"responsavel":false,"empresa":false,"etec":false}',
    relatorio_semestral_data TEXT,
    relatorio_semestral_status TEXT NOT NULL DEFAULT 'em_dia', -- em_dia, pendente, entregue
    situacao TEXT NOT NULL DEFAULT 'termo_pendente', -- termo_pendente, ativo, concluido, rescindido
    criado_em TEXT NOT NULL,
    FOREIGN KEY (candidatura_id) REFERENCES candidatura(id) ON DELETE CASCADE
);

-- 12. LOG_AUDITORIA (Auditoria completa e rastreamento LGPD de acesso a dados de alunos)
CREATE TABLE IF NOT EXISTS log_auditoria (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER,
    usuario_nome TEXT,
    perfil TEXT,
    acao TEXT NOT NULL,
    alvo TEXT NOT NULL,
    data TEXT NOT NULL,
    ip TEXT NOT NULL DEFAULT '127.0.0.1'
);

-- 13. DENUNCIA (Denúncias de vagas pela comunidade ou alunos para a fila da Coordenação)
CREATE TABLE IF NOT EXISTS denuncia (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vaga_id INTEGER NOT NULL,
    motivo TEXT NOT NULL,
    descricao TEXT,
    denunciante_nome TEXT,
    denunciante_contato TEXT,
    situacao TEXT NOT NULL DEFAULT 'pendente', -- pendente, em_apuracao, procedente_bloqueada, arquivada
    parecer_etec TEXT,
    data TEXT NOT NULL,
    FOREIGN KEY (vaga_id) REFERENCES vaga(id) ON DELETE CASCADE
);

-- Tabelas complementares para Vagas Salvas, Notificações, Base da Secretaria e Configurações
CREATE TABLE IF NOT EXISTS vaga_salva (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    aluno_id INTEGER NOT NULL,
    vaga_id INTEGER NOT NULL,
    data TEXT NOT NULL,
    UNIQUE(aluno_id, vaga_id),
    FOREIGN KEY (aluno_id) REFERENCES aluno(id) ON DELETE CASCADE,
    FOREIGN KEY (vaga_id) REFERENCES vaga(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notificacao (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    canal TEXT NOT NULL DEFAULT 'SISTEMA_EMAIL', -- SISTEMA_EMAIL, WHATSAPP
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    lida INTEGER NOT NULL DEFAULT 0,
    data TEXT NOT NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS secretaria_base_aluno (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    matricula TEXT NOT NULL UNIQUE,
    cpf TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    email_secretaria TEXT NOT NULL,
    curso_id INTEGER NOT NULL,
    modulo INTEGER NOT NULL DEFAULT 1,
    turno TEXT NOT NULL DEFAULT 'Noite',
    data_nasc TEXT NOT NULL,
    egresso INTEGER NOT NULL DEFAULT 0,
    telefone TEXT,
    conta_ativada INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (curso_id) REFERENCES curso(id)
);

CREATE TABLE IF NOT EXISTS configuracao (
    chave TEXT PRIMARY KEY,
    valor TEXT NOT NULL,
    descricao TEXT NOT NULL
);

-- Índices para performance de filtros e buscas
CREATE INDEX IF NOT EXISTS idx_vaga_status ON vaga(status);
CREATE INDEX IF NOT EXISTS idx_vaga_prazo ON vaga(prazo);
CREATE INDEX IF NOT EXISTS idx_vaga_tipo ON vaga(tipo);
CREATE INDEX IF NOT EXISTS idx_candidatura_vaga ON candidatura(vaga_id);
CREATE INDEX IF NOT EXISTS idx_candidatura_aluno ON candidatura(aluno_id);
CREATE INDEX IF NOT EXISTS idx_log_data ON log_auditoria(data);

-- ============================================================================
-- SITE INSTITUCIONAL ETEC CUIABÁ (Notícias, Editais, Agenda e Fale Conosco)
-- ============================================================================
CREATE TABLE IF NOT EXISTS noticia (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    titulo TEXT NOT NULL,
    resumo TEXT NOT NULL,
    conteudo TEXT NOT NULL,
    categoria TEXT NOT NULL DEFAULT 'Institucional',
    data_publicacao TEXT, -- YYYY-MM-DD (pode ser nula quando a fonte oficial não informa)
    autor TEXT,
    fonte_url TEXT,
    publicada INTEGER NOT NULL DEFAULT 1,
    criado_em TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS edital (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero TEXT NOT NULL,
    orgao TEXT NOT NULL DEFAULT 'SECITECI/MT',
    titulo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    categoria TEXT NOT NULL DEFAULT 'Alunos', -- Alunos, Servidores, Eventos, FIC
    status TEXT NOT NULL DEFAULT 'aberto', -- aberto, em_andamento, encerrado
    inscricao_inicio TEXT,
    inscricao_fim TEXT,
    documento_url TEXT,
    publicado INTEGER NOT NULL DEFAULT 1,
    criado_em TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS evento_agenda (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    descricao TEXT,
    data_inicio TEXT NOT NULL, -- YYYY-MM-DD
    data_fim TEXT,
    horario TEXT,
    local TEXT,
    link_url TEXT,
    publicado INTEGER NOT NULL DEFAULT 1,
    criado_em TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mensagem_contato (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    telefone TEXT,
    assunto TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    ip TEXT,
    lida INTEGER NOT NULL DEFAULT 0,
    criado_em TEXT NOT NULL
);
