package ec.fin.coacandes.socios.client;

import ec.fin.coacandes.socios.dto.CuentaResponseDTO;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Component
public class CuentasClient {

    private final RestTemplate restTemplate = new RestTemplate();

    public boolean tieneCuentasActivas(UUID socioId) {

        CuentaResponseDTO[] cuentas = restTemplate.getForObject(
                "http://localhost:3000/cuentas/socio/" + socioId,
                CuentaResponseDTO[].class
        );

        if (cuentas == null) {
            return false;
        }

        return Arrays.stream(cuentas)
                .anyMatch(cuenta ->
                        !"CANCELADA".equalsIgnoreCase(cuenta.getEstado())
                );
    }

    public static class CuentaDTO {
        private String estado;

        public String getEstado() {
            return estado;
        }

        public void setEstado(String estado) {
            this.estado = estado;
        }
    }

    public boolean cuentaEstaActiva(UUID cuentaId) {

        CuentaDTO cuenta = restTemplate.getForObject(
                "http://localhost:3000/cuentas/" + cuentaId,
                CuentaDTO.class
        );

        if (cuenta == null) {
            return false;
        }

        return "ACTIVA".equalsIgnoreCase(cuenta.getEstado());
    }
}


