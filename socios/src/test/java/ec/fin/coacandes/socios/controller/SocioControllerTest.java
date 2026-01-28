package ec.fin.coacandes.socios.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import ec.fin.coacandes.socios.dto.SocioRequestDTO;
import ec.fin.coacandes.socios.dto.SocioResponseDTO;
import ec.fin.coacandes.socios.service.SocioService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(SocioController.class)
class SocioControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SocioService socioService;

    // Quitamos el @Autowired para evitar el error de "NoSuchBeanDefinitionException"
    private ObjectMapper objectMapper;

    private SocioResponseDTO socioResponse;
    private UUID socioId;

    @BeforeEach
    void setUp() {
        // Inicialización manual para asegurar que esté disponible
        objectMapper = new ObjectMapper();

        socioId = UUID.randomUUID();
        socioResponse = new SocioResponseDTO();
        socioResponse.setId(socioId);
        socioResponse.setIdentificacion("1725556660");
        // Agrega otros campos necesarios de tu DTO aquí
    }

    @Test
    @DisplayName("POST /api/socios - Debe crear un socio")
    void crearSocio_Exito() throws Exception {
        // GIVEN: Creamos un objeto con TODOS los campos obligatorios
        SocioRequestDTO request = new SocioRequestDTO();
        request.setIdentificacion("1725556660");
        request.setNombres("Micaela Stefania");      // Faltaba
        request.setApellidos("Salcedo Chichande");   // Faltaba
        request.setTipoIdentificacion("CEDULA");     // Faltaba
        request.setEmail("mica@example.com");
        request.setTelefono("0999999999");
        request.setDireccion("Quito, Ecuador");

        when(socioService.crearSocio(any(SocioRequestDTO.class))).thenReturn(socioResponse);

        // WHEN & THEN
        mockMvc.perform(post("/api/socios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated()) // Ahora sí recibirá un 201
                .andExpect(jsonPath("$.id").value(socioId.toString()))
                .andExpect(jsonPath("$.identificacion").value("1725556660"));
    }

    @Test
    @DisplayName("PUT /api/socios/{id} - Debe actualizar un socio")
    void actualizarSocio_Exito() throws Exception {
        // GIVEN: El objeto de actualización también debe ser válido
        SocioRequestDTO updateRequest = new SocioRequestDTO();
        updateRequest.setIdentificacion("1725556660");
        updateRequest.setNombres("Micaela Editado");
        updateRequest.setApellidos("Salcedo Editado");
        updateRequest.setTipoIdentificacion("CEDULA");

        when(socioService.actualizarSocio(eq(socioId), any(SocioRequestDTO.class))).thenReturn(socioResponse);

        // WHEN & THEN
        mockMvc.perform(put("/api/socios/{id}", socioId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk()) // Ahora sí recibirá un 200
                .andExpect(jsonPath("$.id").value(socioId.toString()));
    }

    @Test
    @DisplayName("GET /api/socios/{id} - Debe obtener socio por ID")
    void obtenerSocio_Exito() throws Exception {
        when(socioService.obtenerSocioPorId(socioId)).thenReturn(socioResponse);

        mockMvc.perform(get("/api/socios/{id}", socioId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(socioId.toString()));
    }



    @Test
    @DisplayName("GET /api/socios - Debe obtener todos los socios")
    void obtenerTodos_Exito() throws Exception {
        when(socioService.obtenerTodosLosSocios()).thenReturn(List.of(socioResponse));

        mockMvc.perform(get("/api/socios"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(socioId.toString()));
    }

    @Test
    @DisplayName("DELETE /api/socios/{id} - Debe eliminar lógicamente")
    void eliminarSocio_Exito() throws Exception {
        doNothing().when(socioService).eliminarSocio(socioId);

        mockMvc.perform(delete("/api/socios/{id}", socioId))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("GET /api/socios/identificacion/{id} - Buscar por identificación")
    void buscarPorIdentificacion_Exito() throws Exception {
        when(socioService.obtenerSocioPorIdentificacion("1725556660")).thenReturn(socioResponse);

        mockMvc.perform(get("/api/socios/identificacion/{identificacion}", "1725556660"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.identificacion").value("1725556660"));
    }

    @Test
    @DisplayName("GET /api/socios/{id}/activo - Verificar si está activo")
    void socioExisteYEstaActivo_Exito() throws Exception {
        when(socioService.existeYEstaActivo(socioId)).thenReturn(true);

        mockMvc.perform(get("/api/socios/{id}/activo", socioId))
                .andExpect(status().isOk())
                .andExpect(content().string("true"));
    }
}