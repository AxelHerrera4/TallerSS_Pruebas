package ec.fin.coacandes.socios.service.impl;

import ec.fin.coacandes.socios.client.CuentasClient;
import ec.fin.coacandes.socios.dto.SocioRequestDTO;
import ec.fin.coacandes.socios.dto.SocioResponseDTO;
import ec.fin.coacandes.socios.entity.Socio;
import ec.fin.coacandes.socios.repository.SocioRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.modelmapper.ModelMapper;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SocioServiceImplTest {

    @Mock
    private SocioRepository socioRepository;

    @Mock
    private CuentasClient cuentasClient;

    @Spy
    private ModelMapper modelMapper = new ModelMapper();

    @InjectMocks
    private SocioServiceImpl socioService;

    private Socio socio;
    private SocioRequestDTO socioRequest;
    private UUID socioId;

    @BeforeEach
    void setUp() {
        socioId = UUID.randomUUID();
        socio = new Socio();
        socio.setId(socioId);
        socio.setIdentificacion("1725556660");
        socio.setActivo(true);
        socio.setNombres("Micaela");
        socio.setApellidos("Salcedo");

        socioRequest = new SocioRequestDTO();
        socioRequest.setIdentificacion("1725556660");
        socioRequest.setNombres("Micaela");
        socioRequest.setApellidos("Salcedo");
    }

    // --- 1. MÉTODOS DE CONSULTA (Path Feliz y Not Found) ---

    @Test
    @DisplayName("obtenerSocioPorId - Éxito")
    void obtenerSocioPorId_Exito() {
        when(socioRepository.findById(socioId)).thenReturn(Optional.of(socio));
        assertNotNull(socioService.obtenerSocioPorId(socioId));
    }

    @Test
    @DisplayName("obtenerSocioPorId - Error No Encontrado")
    void obtenerSocioPorId_NotFound() {
        when(socioRepository.findById(socioId)).thenReturn(Optional.empty());
        assertThrows(EntityNotFoundException.class, () -> socioService.obtenerSocioPorId(socioId));
    }

    @Test
    @DisplayName("obtenerSocioPorIdentificacion - Error No Encontrado")
    void obtenerSocioPorIdentificacion_NotFound() {
        when(socioRepository.findByIdentificacion(anyString())).thenReturn(Optional.empty());
        assertThrows(EntityNotFoundException.class, () -> socioService.obtenerSocioPorIdentificacion("123"));
    }

    // --- 2. ACTUALIZAR SOCIO (Cubre todas las ramas de los IF) ---

    @Test
    @DisplayName("actualizarSocio - Error socio inactivo")
    void actualizarSocio_Error_Inactivo() {
        socio.setActivo(false);
        when(socioRepository.findById(socioId)).thenReturn(Optional.of(socio));
        assertThrows(IllegalStateException.class, () -> socioService.actualizarSocio(socioId, socioRequest));
    }

    @Test
    @DisplayName("actualizarSocio - Éxito cuando identificación es igual a la actual")
    void actualizarSocio_MismaIdentificacion_Exito() {
        when(socioRepository.findById(socioId)).thenReturn(Optional.of(socio));
        when(socioRepository.save(any())).thenReturn(socio);

        // socioRequest tiene "1725556660" y socio tiene "1725556660", el IF del exists no debe entrar
        assertNotNull(socioService.actualizarSocio(socioId, socioRequest));
        verify(socioRepository, never()).existsByIdentificacion(anyString());
    }

    // --- 3. ELIMINAR SOCIO (Cubre ramas de Idempotencia y Cuentas) ---

    @Test
    @DisplayName("eliminarSocio - Error Socio No Encontrado")
    void eliminarSocio_NotFound() {
        when(socioRepository.findByIdForUpdate(socioId)).thenReturn(Optional.empty());
        assertThrows(EntityNotFoundException.class, () -> socioService.eliminarSocio(socioId));
    }

    @Test
    @DisplayName("eliminarSocio - Idempotencia (Ya está inactivo)")
    void eliminarSocio_YaInactivo() {
        socio.setActivo(false);
        when(socioRepository.findByIdForUpdate(socioId)).thenReturn(Optional.of(socio));

        socioService.eliminarSocio(socioId);

        verify(cuentasClient, never()).tieneCuentasActivas(any());
        verify(socioRepository, never()).save(any());
    }

    @Test
    @DisplayName("eliminarSocio - Éxito")
    void eliminarSocio_Exito() {
        when(socioRepository.findByIdForUpdate(socioId)).thenReturn(Optional.of(socio));
        when(cuentasClient.tieneCuentasActivas(socioId)).thenReturn(false);

        socioService.eliminarSocio(socioId);

        assertFalse(socio.getActivo());
        verify(socioRepository).save(socio);
    }

    @Test
    @DisplayName("eliminarSocio - Error por Cuentas Activas")
    void eliminarSocio_Error_CuentasActivas() {
        when(socioRepository.findByIdForUpdate(socioId)).thenReturn(Optional.of(socio));
        when(cuentasClient.tieneCuentasActivas(socioId)).thenReturn(true);

        assertThrows(IllegalStateException.class, () -> socioService.eliminarSocio(socioId));
    }

    @Test
    @DisplayName("eliminarSocio - Error en Catch del Cliente")
    void eliminarSocio_Error_Catch() {
        when(socioRepository.findByIdForUpdate(socioId)).thenReturn(Optional.of(socio));
        when(cuentasClient.tieneCuentasActivas(socioId)).thenThrow(new RuntimeException());

        assertThrows(IllegalStateException.class, () -> socioService.eliminarSocio(socioId));
    }

    // --- 4. OTROS ---

    @Test
    @DisplayName("obtenerTodosLosSocios - Lista Vacía")
    void obtenerTodosLosSocios_Vacio() {
        when(socioRepository.findAll()).thenReturn(List.of());
        assertTrue(socioService.obtenerTodosLosSocios().isEmpty());
    }

    @Test
    @DisplayName("existeYEstaActivo - False")
    void existeYEstaActivo_False() {
        when(socioRepository.findByIdAndActivoTrue(socioId)).thenReturn(Optional.empty());
        assertFalse(socioService.existeYEstaActivo(socioId));
    }

    @Test
    @DisplayName("crearSocio - Éxito")
    void crearSocio_Exito() {
        when(socioRepository.existsByIdentificacion(anyString())).thenReturn(false);
        when(socioRepository.save(any())).thenReturn(socio);

        SocioResponseDTO response = socioService.crearSocio(socioRequest);

        assertNotNull(response);
        verify(socioRepository).save(any(Socio.class));
    }

    @Test
    @DisplayName("crearSocio - Error identificación duplicada")
    void crearSocio_Error_Duplicado() {
        when(socioRepository.existsByIdentificacion(anyString())).thenReturn(true);

        assertThrows(IllegalArgumentException.class,
                () -> socioService.crearSocio(socioRequest));
    }

    @Test
    @DisplayName("actualizarSocio - Error identificación ya registrada")
    void actualizarSocio_Error_IdentificacionDuplicada() {
        socioRequest.setIdentificacion("9999999999");

        when(socioRepository.findById(socioId)).thenReturn(Optional.of(socio));
        when(socioRepository.existsByIdentificacion("9999999999")).thenReturn(true);

        assertThrows(IllegalArgumentException.class,
                () -> socioService.actualizarSocio(socioId, socioRequest));
    }

    @Test
    @DisplayName("obtenerSocioPorIdentificacion - Éxito")
    void obtenerSocioPorIdentificacion_Exito() {
        when(socioRepository.findByIdentificacion("1725556660"))
                .thenReturn(Optional.of(socio));

        SocioResponseDTO response =
                socioService.obtenerSocioPorIdentificacion("1725556660");

        assertNotNull(response);
    }

    @Test
    @DisplayName("obtenerTodosLosSocios - Lista con datos")
    void obtenerTodosLosSocios_ConDatos() {
        when(socioRepository.findAll()).thenReturn(List.of(socio));

        List<SocioResponseDTO> result = socioService.obtenerTodosLosSocios();

        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("existeYEstaActivo - True")
    void existeYEstaActivo_True() {
        when(socioRepository.findByIdAndActivoTrue(socioId))
                .thenReturn(Optional.of(socio));

        assertTrue(socioService.existeYEstaActivo(socioId));
    }

    @Test
    @DisplayName("actualizarSocio - Identificación cambia y NO existe (Éxito)")
    void actualizarSocio_IdentificacionCambia_NoExiste_Exito() {
        socioRequest.setIdentificacion("9999999999");

        when(socioRepository.findById(socioId)).thenReturn(Optional.of(socio));
        when(socioRepository.existsByIdentificacion("9999999999")).thenReturn(false);
        when(socioRepository.save(any())).thenReturn(socio);

        SocioResponseDTO response =
                socioService.actualizarSocio(socioId, socioRequest);

        assertNotNull(response);
        verify(socioRepository).save(socio);
    }

}