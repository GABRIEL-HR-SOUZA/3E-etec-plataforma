package br.gov.mt.seciteci.etec.service;

import jakarta.enterprise.context.ApplicationScoped;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@ApplicationScoped
public class VagaValidator {

    private static final List<String> TERMOS_COBRANCA_PROIBIDA = List.of(
            "taxa de inscrição", "taxa de inscricao", "pagar curso", "comprar kit",
            "taxa de cadastro", "cobrança de taxa", "pagamento de taxa", "taxa para participar"
    );

    public record ValidacaoResultado(boolean valido, boolean cobrancaDetectada, List<String> erros) {}

    @SuppressWarnings("unchecked")
    public ValidacaoResultado validarVaga(Map<String, Object> body) {
        List<String> erros = new ArrayList<>();
        boolean cobrancaDetectada = false;

        String titulo = str(body.get("titulo"));
        String tipo = str(body.get("tipo"));
        String atividades = str(body.get("atividades"));
        String requisitos = str(body.get("requisitos"));
        String bolsa = str(body.get("bolsa"));
        String beneficios = str(body.get("beneficios"));
        String cargaHoraria = str(body.get("carga_horaria"));
        String turno = str(body.get("turno"));
        String modalidade = str(body.get("modalidade"));
        String local = str(body.get("local"));
        String prazo = str(body.get("prazo"));
        String formaCandidatura = str(body.get("forma_candidatura"));

        int horasDia = intVal(body.get("horas_dia"), 6);
        int horasSemana = intVal(body.get("horas_semana"), 30);
        int qtdVagas = intVal(body.get("qtd_vagas"), 1);

        List<?> cursos = (body.get("cursos") instanceof List<?> l) ? l : List.of();

        // 1. Checagem dos 15 campos obrigatórios
        if (titulo.isBlank()) erros.add("O campo 'Título da vaga' é obrigatório.");
        if (tipo.isBlank()) erros.add("O campo 'Tipo de vaga' é obrigatório.");
        if (cursos.isEmpty()) erros.add("A vaga deve estar vinculada a pelo menos um Curso Técnico da ETEC Cuiabá.");
        if (atividades.isBlank()) erros.add("O campo 'Atividades' é obrigatório.");
        if (requisitos.isBlank()) erros.add("O campo 'Requisitos' é obrigatório.");
        if (bolsa.isBlank()) erros.add("O campo 'Bolsa / Salário' é obrigatório.");
        if (beneficios.isBlank()) erros.add("O campo 'Benefícios' é obrigatório.");
        if (cargaHoraria.isBlank()) erros.add("O campo 'Carga horária' é obrigatório.");
        if (turno.isBlank()) erros.add("O campo 'Turno' é obrigatório.");
        if (modalidade.isBlank()) erros.add("O campo 'Modalidade' é obrigatório.");
        if (local.isBlank()) erros.add("O campo 'Local / Bairro' é obrigatório.");
        if (qtdVagas < 1) erros.add("O 'Número de vagas' deve ser de pelo menos 1.");
        if (prazo.isBlank()) erros.add("O campo 'Prazo de inscrição' é obrigatório.");
        if (formaCandidatura.isBlank()) erros.add("O campo 'Forma de candidatura' é obrigatório.");

        // 2. Regra 3 — Cobrança proibida de candidatos
        String textoCompleto = (titulo + " " + atividades + " " + requisitos + " " + bolsa).toLowerCase();
        for (String termo : TERMOS_COBRANCA_PROIBIDA) {
            if (textoCompleto.contains(termo)) {
                cobrancaDetectada = true;
                erros.add("VIOLAÇÃO GRAVE (Regra #3): É estritamente proibido cobrar qualquer valor do candidato (taxa, curso ou kit).");
                break;
            }
        }

        // 3. Regra do salário "A combinar": permitido APENAS em vaga CLT
        boolean isEstagio = tipo.toLowerCase().contains("estágio") || tipo.toLowerCase().contains("estagio");
        boolean isEstagioNaoObrigatorio = tipo.equalsIgnoreCase("Estágio não obrigatório") || tipo.equalsIgnoreCase("Estagio nao obrigatorio");
        boolean isClt = tipo.equalsIgnoreCase("CLT");

        if (bolsa.toLowerCase().contains("combinar") && !isClt) {
            erros.add("O valor 'A combinar' só é permitido em vagas do tipo CLT. Informe o valor da bolsa ou remuneração.");
        }

        // 4. Regra 4 — Lei do Estágio (Lei Federal nº 11.788/2008)
        if (isEstagio) {
            if (horasDia > 6) {
                erros.add("Lei do Estágio (Lei 11.788/2008, Art. 10, II): A jornada diária de estágio para educação profissional técnica não pode ultrapassar 6 horas/dia.");
            }
            if (horasSemana > 30) {
                erros.add("Lei do Estágio (Lei 11.788/2008, Art. 10, II): A jornada semanal de estágio para educação profissional técnica não pode ultrapassar 30 horas/semana.");
            }
            if (isEstagioNaoObrigatorio) {
                if (bolsa.toLowerCase().contains("sem bolsa") || bolsa.equals("0") || bolsa.equalsIgnoreCase("R$ 0,00")) {
                    erros.add("Lei do Estágio (Art. 12): No estágio não obrigatório é compulsória a concessão de bolsa-auxílio.");
                }
                String benLower = beneficios.toLowerCase();
                if (!benLower.contains("transporte") && !benLower.contains("vale-transporte")) {
                    erros.add("Lei do Estágio (Art. 12): No estágio não obrigatório é obrigatória a concessão de Auxílio-transporte nos benefícios.");
                }
            }
        }

        // 5. Prazo máximo de 60 dias
        if (!prazo.isBlank()) {
            try {
                LocalDate dataPrazo = LocalDate.parse(prazo);
                LocalDate hoje = LocalDate.now();
                if (dataPrazo.isBefore(hoje)) {
                    erros.add("O prazo de inscrição não pode ser uma data passada.");
                } else if (ChronoUnit.DAYS.between(hoje, dataPrazo) > 60) {
                    erros.add("O prazo de inscrição da vaga não pode ultrapassar 60 dias a partir de hoje.");
                }
            } catch (Exception e) {
                erros.add("Formato de data inválido no prazo de inscrição (use AAAA-MM-DD).");
            }
        }

        return new ValidacaoResultado(erros.isEmpty(), cobrancaDetectada, erros);
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
