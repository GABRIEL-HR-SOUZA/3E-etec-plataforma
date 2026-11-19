package br.gov.mt.seciteci.etec.service;

import br.gov.mt.seciteci.etec.config.DatabaseManager;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@ApplicationScoped
public class ScheduledTasksService {

    @Inject
    DatabaseManager db;

    @Inject
    AuthService authService;

    private static final DateTimeFormatter DT_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    /**
     * Roda automaticamente todos os dias (e na inicialização após 15s) para:
     * 1. Encerrar vagas cujo prazo já venceu (Princípio: "Vaga sempre atual").
     * 2. Avisar empresas quando faltam 3 dias para o prazo da vaga expirar.
     * 3. Anonimizar candidaturas de vagas encerradas há mais de 2 anos (Regra LGPD).
     */
    @Scheduled(every = "24h", delayed = "10s", identity = "rotina-diaria-portal-vagas-etec")
    public void executarRotinaDiaria() {
        String hoje = LocalDate.now().toString();
        String daqui3Dias = LocalDate.now().plusDays(3).toString();
        String doisAnosAtras = LocalDate.now().minusYears(2).toString();
        String agora = LocalDateTime.now().format(DT_FMT);

        try (Connection conn = db.getConnection()) {
            // 1. Encerra vagas publicadas cujo prazo venceu
            try (PreparedStatement psEnc = conn.prepareStatement(
                    "UPDATE vaga SET status = 'encerrada', encerrado_em = ? WHERE status = 'publicada' AND prazo < ?")) {
                psEnc.setString(1, agora);
                psEnc.setString(2, hoje);
                int encerradas = psEnc.executeUpdate();
                if (encerradas > 0) {
                    authService.registrarLog(conn, null, "Quarkus Scheduler (@Scheduled)", "SISTEMA",
                            "EXPIRACAO_AUTOMATICA_VAGAS", encerradas + " vaga(s) encerrada(s) automaticamente por fim de prazo", "127.0.0.1");
                }
            }

            // 2. Avisa empresas sobre vagas que expiram em até 3 dias
            try (PreparedStatement psAviso = conn.prepareStatement(
                    "SELECT v.id, v.titulo, v.prazo, eu.usuario_id " +
                    "FROM vaga v JOIN empresa_usuario eu ON eu.empresa_id = v.empresa_id " +
                    "WHERE v.status = 'publicada' AND v.prazo = ?")) {
                psAviso.setString(1, daqui3Dias);
                try (ResultSet rs = psAviso.executeQuery()) {
                    while (rs.next()) {
                        int vagaId = rs.getInt("id");
                        String titulo = rs.getString("titulo");
                        int usuarioEmpresaId = rs.getInt("usuario_id");
                        try (PreparedStatement psNotif = conn.prepareStatement(
                                "INSERT INTO notificacao (usuario_id, canal, titulo, mensagem, lida, data) VALUES (?, 'SISTEMA_EMAIL', ?, ?, 0, ?)")) {
                            psNotif.setInt(1, usuarioEmpresaId);
                            psNotif.setString(2, "Sua vaga #" + vagaId + " encerra em 3 dias");
                            psNotif.setString(3, "A vaga '" + titulo + "' expira em 3 dias. Acesse o painel da empresa caso deseje solicitar prorrogação à Coordenação da ETEC.");
                            psNotif.setString(4, agora);
                            psNotif.executeUpdate();
                        }
                    }
                }
            }

            // 3. LGPD Retenção: Anonimiza carta/observação de candidaturas de vagas encerradas há mais de 2 anos
            try (PreparedStatement psLgpd = conn.prepareStatement(
                    "UPDATE candidatura SET carta = '[Anonimizado após 2 anos — LGPD]', observacao_empresa = '[Anonimizado — LGPD]' " +
                    "WHERE vaga_id IN (SELECT id FROM vaga WHERE status = 'encerrada' AND prazo < ?)")) {
                psLgpd.setString(1, doisAnosAtras);
                psLgpd.executeUpdate();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
