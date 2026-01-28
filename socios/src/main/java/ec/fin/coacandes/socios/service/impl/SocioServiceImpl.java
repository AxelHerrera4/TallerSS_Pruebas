package ec.fin.coacandes.socios.service.impl;

import ec.fin.coacandes.socios.client.CuentasClient;
import ec.fin.coacandes.socios.dto.SocioRequestDTO;
import ec.fin.coacandes.socios.dto.SocioResponseDTO;
import ec.fin.coacandes.socios.entity.Socio;
import ec.fin.coacandes.socios.repository.SocioRepository;
import ec.fin.coacandes.socios.service.SocioService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class SocioServiceImpl implements SocioService {

    private final SocioRepository socioRepository;
    private final ModelMapper modelMapper;
    private final CuentasClient cuentasClient;


    @Override
    public SocioResponseDTO crearSocio(SocioRequestDTO request) {
        // Validar identificación única
        if (socioRepository.existsByIdentificacion(request.getIdentificacion())) {
            throw new IllegalArgumentException("Ya existe un socio con esta identificación");
        }

        Socio socio = modelMapper.map(request, Socio.class);

        Socio guardado = socioRepository.save(socio);
        return modelMapper.map(guardado, SocioResponseDTO.class);
    }

    @Override
    public SocioResponseDTO actualizarSocio(UUID id, SocioRequestDTO request) {
        Socio socio = socioRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Socio no encontrado"));

        // Validar si cambia la identificación
        if (!socio.getActivo()) {
            throw new IllegalStateException("No se puede actualizar un socio inactivo");
        }

        if (!socio.getIdentificacion().equals(request.getIdentificacion()) &&
                socioRepository.existsByIdentificacion(request.getIdentificacion())) {
            throw new IllegalArgumentException("La nueva identificación ya está registrada");
        }

        modelMapper.map(request, socio);

        Socio actualizado = socioRepository.save(socio);
        return modelMapper.map(actualizado, SocioResponseDTO.class);
    }

    @Override
    public SocioResponseDTO obtenerSocioPorId(UUID id) {
        Socio socio = socioRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Socio no encontrado"));
        return modelMapper.map(socio, SocioResponseDTO.class);
    }

    @Override
    public List<SocioResponseDTO> obtenerTodosLosSocios() {
        return socioRepository.findAll().stream()
                .map(socio -> modelMapper.map(socio, SocioResponseDTO.class))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void eliminarSocio(UUID id) {


        Socio socio = socioRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new EntityNotFoundException("Socio no encontrado"));


        if (!Boolean.TRUE.equals(socio.getActivo())) {
            return;
        }

        boolean tieneCuentasActivas;
        try {
            tieneCuentasActivas = cuentasClient.tieneCuentasActivas(id);
        } catch (Exception e) {
            throw new IllegalStateException(
                    "No se pudo validar cuentas del socio. Eliminación cancelada por seguridad.",
                    e
            );
        }

        if (tieneCuentasActivas) {
            throw new IllegalStateException(
                    "No se puede eliminar el socio porque tiene cuentas activas"
            );
        }


        socio.setActivo(false);
        socioRepository.save(socio);
    }




    @Override
    public SocioResponseDTO obtenerSocioPorIdentificacion(String identificacion) {
        Socio socio = socioRepository.findByIdentificacion(identificacion)
                .orElseThrow(() -> new EntityNotFoundException("Socio no encontrado"));
        return modelMapper.map(socio, SocioResponseDTO.class);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existeYEstaActivo(UUID socioId) {
        return socioRepository.findByIdAndActivoTrue(socioId).isPresent();
    }

}
