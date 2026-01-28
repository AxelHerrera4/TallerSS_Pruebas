package ec.fin.coacandes.socios.dto;

import lombok.Data;

@Data
public class CuentaResponseDTO {
    private String id;
    private String estado; // ACTIVA | SUSPENDIDA | CANCELADA
}

