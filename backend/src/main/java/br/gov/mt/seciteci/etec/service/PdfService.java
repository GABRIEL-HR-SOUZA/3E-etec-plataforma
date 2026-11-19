package br.gov.mt.seciteci.etec.service;

import br.gov.mt.seciteci.etec.config.DatabaseManager;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.FileOutputStream;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@ApplicationScoped
public class PdfService {

    @Inject
    DatabaseManager db;

    private static final Color AZUL_ETEC = new Color(28, 69, 135);
    private static final Color CINZA_FUNDO = new Color(242, 245, 250);

    public byte[] gerarTermoCompromissoPdf(Map<String, Object> dadosEstagio) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4, 42, 42, 40, 40);
            PdfWriter.getInstance(doc, baos);
            doc.open();

            Font fTituloGov = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, AZUL_ETEC);
            Font fTituloDoc = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, AZUL_ETEC);
            Font fSubtitulo = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.DARK_GRAY);
            Font fSecao = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.WHITE);
            Font fLabel = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.BLACK);
            Font fTexto = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.BLACK);
            Font fRodape = FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 8, Color.GRAY);

            // Cabeçalho Institucional
            Paragraph cab1 = new Paragraph("GOVERNO DO ESTADO DE MATO GROSSO", fTituloGov);
            cab1.setAlignment(Element.ALIGN_CENTER);
            doc.add(cab1);

            Paragraph cab2 = new Paragraph("SECRETARIA DE ESTADO DE CIÊNCIA, TECNOLOGIA E INOVAÇÃO — SECITECI\nESCOLA TÉCNICA ESTADUAL DE EDUCAÇÃO PROFISSIONAL E TECNOLÓGICA DE CUIABÁ", fSubtitulo);
            cab2.setAlignment(Element.ALIGN_CENTER);
            cab2.setSpacingAfter(12);
            doc.add(cab2);

            Paragraph titulo = new Paragraph("TERMO DE COMPROMISSO DE ESTÁGIO SUPERVISIONADO", fTituloDoc);
            titulo.setAlignment(Element.ALIGN_CENTER);
            doc.add(titulo);

            Paragraph lei = new Paragraph("(Instrumento Jurídico nos termos da Lei Federal nº 11.788, de 25 de setembro de 2008, e Lei nº 13.709/2018 — LGPD)", fRodape);
            lei.setAlignment(Element.ALIGN_CENTER);
            lei.setSpacingAfter(14);
            doc.add(lei);

            // Cálculo de idade do aluno para verificação de Menor de 18 anos (Regra de Negócio #5)
            String dataNascStr = String.valueOf(dadosEstagio.getOrDefault("aluno_data_nasc", "2006-01-01"));
            int idade = 18;
            try {
                idade = Period.between(LocalDate.parse(dataNascStr), LocalDate.now()).getYears();
            } catch (Exception ignored) {}
            boolean menorDeIdade = idade < 18;

            // 1. Instituição de Ensino
            adicionarCabecalhoSecao(doc, "1. INSTITUIÇÃO DE ENSINO INTERVENIENTE", fSecao);
            PdfPTable tInst = new PdfPTable(2);
            tInst.setWidthPercentage(100);
            tInst.setSpacingAfter(8);
            adicionarCelula(tInst, "Razão Social:", "Escola Técnica Estadual de Educação Profissional e Tecnológica de Cuiabá (ETEC/SECITECI-MT)", fLabel, fTexto);
            adicionarCelula(tInst, "Endereço:", "Av. Gonçalo Antunes de Barros, S/N — Novo Mato Grosso, Cuiabá/MT — CEP 78058-743", fLabel, fTexto);
            doc.add(tInst);

            // 2. Unidade Concedente (Empresa)
            adicionarCabecalhoSecao(doc, "2. UNIDADE CONCEDENTE (EMPRESA PARCEIRA)", fSecao);
            PdfPTable tEmp = new PdfPTable(2);
            tEmp.setWidthPercentage(100);
            tEmp.setSpacingAfter(8);
            adicionarCelula(tEmp, "Razão Social / Fantasia:", dadosEstagio.getOrDefault("empresa_razao", "") + " (" + dadosEstagio.getOrDefault("empresa_nome", "") + ")", fLabel, fTexto);
            adicionarCelula(tEmp, "CNPJ:", String.valueOf(dadosEstagio.getOrDefault("empresa_cnpj", "")), fLabel, fTexto);
            adicionarCelula(tEmp, "Endereço / Cidade:", dadosEstagio.getOrDefault("empresa_endereco", "") + " — " + dadosEstagio.getOrDefault("empresa_cidade", "Cuiabá/MT"), fLabel, fTexto);
            adicionarCelula(tEmp, "Supervisor(a) Técnico:", dadosEstagio.getOrDefault("supervisor_nome", "") + " (" + dadosEstagio.getOrDefault("supervisor_cargo", "") + ")", fLabel, fTexto);
            doc.add(tEmp);

            // 3. Estagiário(a)
            adicionarCabecalhoSecao(doc, "3. DADOS DO(A) ALUNO(A) ESTAGIÁRIO(A)", fSecao);
            PdfPTable tAlu = new PdfPTable(2);
            tAlu.setWidthPercentage(100);
            tAlu.setSpacingAfter(8);
            adicionarCelula(tAlu, "Nome do(a) Estagiário(a):", String.valueOf(dadosEstagio.getOrDefault("aluno_nome", "")), fLabel, fTexto);
            adicionarCelula(tAlu, "Matrícula / CPF:", "Matrícula " + dadosEstagio.getOrDefault("aluno_matricula", "") + " | CPF: " + dadosEstagio.getOrDefault("aluno_cpf", ""), fLabel, fTexto);
            adicionarCelula(tAlu, "Curso Técnico / Módulo:", dadosEstagio.getOrDefault("curso_nome", "") + " — " + dadosEstagio.getOrDefault("aluno_modulo", "") + "º Módulo (Turno: " + dadosEstagio.getOrDefault("aluno_turno", "") + ")", fLabel, fTexto);
            adicionarCelula(tAlu, "Data de Nascimento / Idade:", dataNascStr + " (" + idade + " anos" + (menorDeIdade ? " — MENOR DE 18 ANOS: EXIGE ASSINATURA DO RESPONSÁVEL LEGAL" : " — Maior de idade") + ")", fLabel, fTexto);
            if (menorDeIdade) {
                adicionarCelula(tAlu, "Responsável Legal:", String.valueOf(dadosEstagio.getOrDefault("responsavel_nome", "Responsável Legal Cadastrado")), fLabel, fTexto);
                adicionarCelula(tAlu, "CPF do Responsável:", String.valueOf(dadosEstagio.getOrDefault("responsavel_cpf", "Confirmado na Secretaria ETEC")), fLabel, fTexto);
            }
            doc.add(tAlu);

            // 4. Condições do Estágio (Lei 11.788/2008)
            adicionarCabecalhoSecao(doc, "4. CONDIÇÕES REGULAMENTARES DO ESTÁGIO (LEI Nº 11.788/2008)", fSecao);
            PdfPTable tCond = new PdfPTable(2);
            tCond.setWidthPercentage(100);
            tCond.setSpacingAfter(10);
            adicionarCelula(tCond, "Vaga / Modalidade:", dadosEstagio.getOrDefault("vaga_titulo", "") + " (" + dadosEstagio.getOrDefault("vaga_tipo", "") + ")", fLabel, fTexto);
            adicionarCelula(tCond, "Vigência do Estágio:", "De " + dadosEstagio.getOrDefault("data_inicio", "") + " até " + dadosEstagio.getOrDefault("data_fim", "") + " (Relatório semestral até " + dadosEstagio.getOrDefault("relatorio_semestral_data", "") + ")", fLabel, fTexto);
            adicionarCelula(tCond, "Jornada de Atividades:", dadosEstagio.getOrDefault("carga_horaria", "6h/dia, 30h/semana") + " — Turno: " + dadosEstagio.getOrDefault("vaga_turno", "") + " (Compatível com o horário escolar)", fLabel, fTexto);
            adicionarCelula(tCond, "Bolsa e Benefícios:", "Bolsa: " + dadosEstagio.getOrDefault("bolsa", "") + " | Benefícios: " + dadosEstagio.getOrDefault("beneficios", ""), fLabel, fTexto);
            doc.add(tCond);

            // Cláusulas Resumidas
            Paragraph clausulas = new Paragraph(
                    "CLÁUSULA 1ª — O presente Termo de Compromisso reger-se-á pela Lei Federal nº 11.788/2008, visando ao aprendizado de competências próprias da atividade profissional e à contextualização curricular do curso técnico da ETEC Cuiabá.\n" +
                    "CLÁUSULA 2ª — A jornada de atividade em estágio não ultrapassará 6 (seis) horas diárias e 30 (trinta) horas semanais (Art. 10, II da Lei 11.788/2008), sendo totalmente compatível com o turno de aulas do(a) estudante.\n" +
                    "CLÁUSULA 3ª — A Unidade Concedente e o(a) Estagiário(a) comprometem-se a enviar à Coordenação de Estágio da ETEC Cuiabá, com periodicidade máxima de 6 (seis) meses, o Relatório Semestral de Atividades.\n" +
                    "CLÁUSULA 4ª (LGPD) — Os dados pessoais constantes neste instrumento serão tratados exclusivamente para fins de execução e fiscalização acadêmica do estágio, nos termos da Lei nº 13.709/2018.",
                    fTexto
            );
            clausulas.setAlignment(Element.ALIGN_JUSTIFIED);
            clausulas.setSpacingAfter(18);
            doc.add(clausulas);

            // Quadro de Assinaturas
            int numAssinaturas = menorDeIdade ? 4 : 3;
            PdfPTable tAss = new PdfPTable(numAssinaturas);
            tAss.setWidthPercentage(100);
            tAss.setSpacingBefore(14);

            adicionarBlocoAssinatura(tAss, "ALUNO(A) ESTAGIÁRIO(A)", String.valueOf(dadosEstagio.getOrDefault("aluno_nome", "")), Boolean.TRUE.equals(dadosEstagio.get("ass_aluno")), fLabel, fTexto);
            if (menorDeIdade) {
                adicionarBlocoAssinatura(tAss, "RESPONSÁVEL LEGAL (MENOR < 18)", String.valueOf(dadosEstagio.getOrDefault("responsavel_nome", "Responsável Legal")), Boolean.TRUE.equals(dadosEstagio.get("ass_responsavel")), fLabel, fTexto);
            }
            adicionarBlocoAssinatura(tAss, "EMPRESA CONCEDENTE", String.valueOf(dadosEstagio.getOrDefault("empresa_nome", "")), Boolean.TRUE.equals(dadosEstagio.get("ass_empresa")), fLabel, fTexto);
            adicionarBlocoAssinatura(tAss, "COORDENAÇÃO DE ESTÁGIO ETEC", "ETEC Cuiabá — SECITECI/MT", Boolean.TRUE.equals(dadosEstagio.get("ass_etec")), fLabel, fTexto);

            doc.add(tAss);

            Paragraph dataLocal = new Paragraph("\nCuiabá/MT, " + LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + " — Documento gerado eletronicamente pelo Portal de Vagas ETEC Cuiabá.", fRodape);
            dataLocal.setAlignment(Element.ALIGN_CENTER);
            doc.add(dataLocal);

            doc.close();
            byte[] pdfBytes = baos.toByteArray();

            // Salva cópia em disco na pasta privada fora da pasta pública (Regra SQLite/Segurança)
            Object idObj = dadosEstagio.get("id");
            if (idObj != null) {
                Path target = Paths.get(db.getStorageDir(), "termo_estagio_" + idObj + ".pdf");
                try (FileOutputStream fos = new FileOutputStream(target.toFile())) {
                    fos.write(pdfBytes);
                }
            }

            return pdfBytes;
        } catch (Exception e) {
            throw new RuntimeException("Erro ao gerar Termo de Compromisso em PDF", e);
        }
    }

    public byte[] gerarRelatorioIndicadoresPdf(Map<String, Object> relatorio) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4, 40, 40, 40, 40);
            PdfWriter.getInstance(doc, baos);
            doc.open();

            Font fTitulo = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, AZUL_ETEC);
            Font fSub = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.DARK_GRAY);
            Font fSecao = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.WHITE);
            Font fLabel = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.BLACK);
            Font fTexto = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.BLACK);

            Paragraph p1 = new Paragraph("ETEC CUIABÁ — SECITECI / GOVERNO DE MATO GROSSO", fSub);
            p1.setAlignment(Element.ALIGN_CENTER);
            doc.add(p1);

            Paragraph p2 = new Paragraph("RELATÓRIO OFICIAL DE EMPREGABILIDADE E INDICADORES DO PORTAL DE VAGAS", fTitulo);
            p2.setAlignment(Element.ALIGN_CENTER);
            p2.setSpacingAfter(14);
            doc.add(p2);

            @SuppressWarnings("unchecked")
            Map<String, Object> resumo = (Map<String, Object>) relatorio.getOrDefault("resumo", Map.of());

            adicionarCabecalhoSecao(doc, "1. INDICADORES GERAIS DE DESEMPENHO E EMPREGABILIDADE", fSecao);
            PdfPTable tRes = new PdfPTable(2);
            tRes.setWidthPercentage(100);
            tRes.setSpacingAfter(12);
            adicionarCelula(tRes, "Total de Vagas Publicadas:", String.valueOf(resumo.getOrDefault("vagasPublicadas", 0)), fLabel, fTexto);
            adicionarCelula(tRes, "Total de Candidaturas:", String.valueOf(resumo.getOrDefault("totalCandidaturas", 0)), fLabel, fTexto);
            adicionarCelula(tRes, "Alunos e Egressos Contratados (Empregabilidade):", String.valueOf(resumo.getOrDefault("alunosContratados", 0)), fLabel, fTexto);
            adicionarCelula(tRes, "Taxa de Preenchimento de Vagas:", resumo.getOrDefault("taxaPreenchimento", 0) + "%", fLabel, fTexto);
            adicionarCelula(tRes, "Tempo Médio até Aprovação:", resumo.getOrDefault("tempoMedioAprovacaoHoras", 18) + " horas", fLabel, fTexto);
            adicionarCelula(tRes, "Empresas Parceiras Ativas:", String.valueOf(resumo.getOrDefault("empresasAtivas", 0)), fLabel, fTexto);
            adicionarCelula(tRes, "Estágios Ativos / Termos Pendentes:", resumo.getOrDefault("estagiosAtivos", 0) + " ativos / " + resumo.getOrDefault("termosPendentes", 0) + " pendentes", fLabel, fTexto);
            adicionarCelula(tRes, "Denúncias Registradas:", String.valueOf(resumo.getOrDefault("totalDenuncias", 0)), fLabel, fTexto);
            doc.add(tRes);

            adicionarCabecalhoSecao(doc, "2. DESEMPENHO E EMPREGABILIDADE POR CURSO TÉCNICO", fSecao);
            PdfPTable tCursos = new PdfPTable(4);
            tCursos.setWidthPercentage(100);
            tCursos.addCell(new PdfPCell(new Phrase("Curso Técnico", fLabel)));
            tCursos.addCell(new PdfPCell(new Phrase("Eixo Tecnológico", fLabel)));
            tCursos.addCell(new PdfPCell(new Phrase("Vagas Abertas", fLabel)));
            tCursos.addCell(new PdfPCell(new Phrase("Contratados", fLabel)));

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> porCurso = (List<Map<String, Object>>) relatorio.getOrDefault("porCurso", List.of());
            for (Map<String, Object> c : porCurso) {
                tCursos.addCell(new PdfPCell(new Phrase(String.valueOf(c.getOrDefault("curso", "")), fTexto)));
                tCursos.addCell(new PdfPCell(new Phrase(String.valueOf(c.getOrDefault("eixo", "")), fTexto)));
                tCursos.addCell(new PdfPCell(new Phrase(String.valueOf(c.getOrDefault("vagas", 0)), fTexto)));
                tCursos.addCell(new PdfPCell(new Phrase(String.valueOf(c.getOrDefault("contratados", 0)), fTexto)));
            }
            doc.add(tCursos);

            doc.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Erro ao gerar PDF de relatórios", e);
        }
    }

    private void adicionarCabecalhoSecao(Document doc, String titulo, Font font) throws Exception {
        PdfPTable table = new PdfPTable(1);
        table.setWidthPercentage(100);
        PdfPCell cell = new PdfPCell(new Phrase(titulo, font));
        cell.setBackgroundColor(AZUL_ETEC);
        cell.setPadding(5);
        cell.setBorderColor(AZUL_ETEC);
        table.addCell(cell);
        doc.add(table);
    }

    private void adicionarCelula(PdfPTable table, String label, String valor, Font fLabel, Font fTexto) {
        PdfPCell c1 = new PdfPCell(new Phrase(label, fLabel));
        c1.setBackgroundColor(CINZA_FUNDO);
        c1.setPadding(5);
        c1.setBorderColor(Color.LIGHT_GRAY);

        PdfPCell c2 = new PdfPCell(new Phrase(valor, fTexto));
        c2.setPadding(5);
        c2.setBorderColor(Color.LIGHT_GRAY);

        table.addCell(c1);
        table.addCell(c2);
    }

    private void adicionarBlocoAssinatura(PdfPTable table, String papel, String nome, boolean assinado, Font fLabel, Font fTexto) {
        PdfPCell cell = new PdfPCell();
        cell.setPadding(8);
        cell.setBorderColor(Color.LIGHT_GRAY);
        Paragraph pStatus = new Paragraph(assinado ? "[ASSINADO DIGITALMENTE]" : "[AGUARDANDO ASSINATURA]", fLabel);
        pStatus.setAlignment(Element.ALIGN_CENTER);
        cell.addElement(pStatus);

        Paragraph pLinha = new Paragraph("_______________________", fTexto);
        pLinha.setAlignment(Element.ALIGN_CENTER);
        cell.addElement(pLinha);

        Paragraph pNome = new Paragraph(nome + "\n(" + papel + ")", fTexto);
        pNome.setAlignment(Element.ALIGN_CENTER);
        cell.addElement(pNome);

        table.addCell(cell);
    }
}
