import { Test, TestingModule } from '@nestjs/testing';
import { CuentasController } from './cuentas.controller';
import { CuentasService } from './cuentas.service';
import { CuentaRequestDto } from './dto/cuenta-request.dto';
import { CuentaResponseDto } from './dto/cuenta-response.dto';

describe('CuentasController', () => {
  let controller: CuentasController;
  let service: CuentasService;

  const mockCuentaResponse: CuentaResponseDto = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    socioId: '456e7890-e89b-12d3-a456-426614174111',
    numeroCuenta: '001-123456789',
    saldo: 1000.0,
    estado: 'ACTIVA',
    tipoCuenta: 'AHORRO',
    fechaCreacion: new Date('2024-01-01'),
    fechaActualizacion: new Date('2024-01-01'),
  };

  const mockCuentaRequest: CuentaRequestDto = {
    socioId: '456e7890-e89b-12d3-a456-426614174111',
    numeroCuenta: '001-123456789',
    saldo: 1000.0,
    tipoCuenta: 'AHORRO',
  };

  const mockCuentasService = {
    crearCuenta: jest.fn(),
    actualizarCuenta: jest.fn(),
    obtenerCuenta: jest.fn(),
    obtenerTodasCuentas: jest.fn(),
    obtenerCuentasPorSocio: jest.fn(),
    eliminarCuenta: jest.fn(),
    realizarRetiro: jest.fn(),
    realizarDeposito: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CuentasController],
      providers: [
        {
          provide: CuentasService,
          useValue: mockCuentasService,
        },
      ],
    }).compile();

    controller = module.get<CuentasController>(CuentasController);
    service = module.get<CuentasService>(CuentasService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('crearCuenta', () => {
    it('debería crear una cuenta exitosamente', async () => {
      mockCuentasService.crearCuenta.mockResolvedValue(mockCuentaResponse);

      const result = await controller.crearCuenta(mockCuentaRequest);

      expect(result).toEqual(mockCuentaResponse);
      expect(service.crearCuenta).toHaveBeenCalledWith(mockCuentaRequest);
      expect(service.crearCuenta).toHaveBeenCalledTimes(1);
    });
  });

  describe('actualizarCuenta', () => {
    it('debería actualizar una cuenta existente', async () => {
      const updateDto = { ...mockCuentaRequest, tipoCuenta: 'CORRIENTE' };
      const updatedResponse = { ...mockCuentaResponse, tipoCuenta: 'CORRIENTE' };
      
      mockCuentasService.actualizarCuenta.mockResolvedValue(updatedResponse);

      const result = await controller.actualizarCuenta(mockCuentaResponse.id, updateDto);

      expect(result).toEqual(updatedResponse);
      expect(service.actualizarCuenta).toHaveBeenCalledWith(mockCuentaResponse.id, updateDto);
    });
  });

  describe('obtenerCuenta', () => {
    it('debería obtener una cuenta por ID', async () => {
      mockCuentasService.obtenerCuenta.mockResolvedValue(mockCuentaResponse);

      const result = await controller.obtenerCuenta(mockCuentaResponse.id);

      expect(result).toEqual(mockCuentaResponse);
      expect(service.obtenerCuenta).toHaveBeenCalledWith(mockCuentaResponse.id);
    });
  });

  describe('obtenerTodas', () => {
    it('debería obtener todas las cuentas activas', async () => {
      const cuentas = [mockCuentaResponse, { ...mockCuentaResponse, id: 'otro-id' }];
      mockCuentasService.obtenerTodasCuentas.mockResolvedValue(cuentas);

      const result = await controller.obtenerTodas();

      expect(result).toEqual(cuentas);
      expect(result).toHaveLength(2);
      expect(service.obtenerTodasCuentas).toHaveBeenCalledTimes(1);
    });

    it('debería retornar array vacío si no hay cuentas', async () => {
      mockCuentasService.obtenerTodasCuentas.mockResolvedValue([]);

      const result = await controller.obtenerTodas();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('obtenerPorSocio', () => {
    it('debería obtener todas las cuentas de un socio', async () => {
      const cuentas = [mockCuentaResponse];
      mockCuentasService.obtenerCuentasPorSocio.mockResolvedValue(cuentas);

      const result = await controller.obtenerPorSocio(mockCuentaResponse.socioId);

      expect(result).toEqual(cuentas);
      expect(service.obtenerCuentasPorSocio).toHaveBeenCalledWith(mockCuentaResponse.socioId);
    });

    it('debería retornar array vacío si el socio no tiene cuentas', async () => {
      mockCuentasService.obtenerCuentasPorSocio.mockResolvedValue([]);

      const result = await controller.obtenerPorSocio('socio-sin-cuentas');

      expect(result).toEqual([]);
    });
  });

  describe('eliminarCuenta', () => {
    it('debería eliminar una cuenta correctamente', async () => {
      mockCuentasService.eliminarCuenta.mockResolvedValue(undefined);

      const result = await controller.eliminarCuenta(mockCuentaResponse.id);

      expect(result).toBeUndefined();
      expect(service.eliminarCuenta).toHaveBeenCalledWith(mockCuentaResponse.id);
    });
  });

  describe('realizarRetiro', () => {
    it('debería realizar un retiro exitosamente', async () => {
      const monto = 300;
      const cuentaDespuesRetiro = { ...mockCuentaResponse, saldo: 700 };
      
      mockCuentasService.realizarRetiro.mockResolvedValue(cuentaDespuesRetiro);

      const result = await controller.realizarRetiro(mockCuentaResponse.id, monto);

      expect(result).toEqual(cuentaDespuesRetiro);
      expect(result.saldo).toBe(700);
      expect(service.realizarRetiro).toHaveBeenCalledWith(mockCuentaResponse.id, monto);
    });

    it('debería manejar múltiples retiros', async () => {
      const montos = [100, 200, 150];
      let saldoActual = 1000;

      for (const monto of montos) {
        saldoActual -= monto;
        const cuentaActualizada = { ...mockCuentaResponse, saldo: saldoActual };
        mockCuentasService.realizarRetiro.mockResolvedValue(cuentaActualizada);

        const result = await controller.realizarRetiro(mockCuentaResponse.id, monto);
        expect(result.saldo).toBe(saldoActual);
      }

      expect(service.realizarRetiro).toHaveBeenCalledTimes(3);
    });
  });

  describe('realizarDeposito', () => {
    it('debería realizar un depósito exitosamente', async () => {
      const monto = 500;
      const cuentaDespuesDeposito = { ...mockCuentaResponse, saldo: 1500 };
      
      mockCuentasService.realizarDeposito.mockResolvedValue(cuentaDespuesDeposito);

      const result = await controller.realizarDeposito(mockCuentaResponse.id, monto);

      expect(result).toEqual(cuentaDespuesDeposito);
      expect(result.saldo).toBe(1500);
      expect(service.realizarDeposito).toHaveBeenCalledWith(mockCuentaResponse.id, monto);
    });

    it('debería manejar depósitos de diferentes montos', async () => {
      const montos = [100, 250, 500, 1000];

      for (const monto of montos) {
        const cuentaActualizada = { ...mockCuentaResponse, saldo: 1000 + monto };
        mockCuentasService.realizarDeposito.mockResolvedValue(cuentaActualizada);

        const result = await controller.realizarDeposito(mockCuentaResponse.id, monto);
        expect(result.saldo).toBe(1000 + monto);
      }

      expect(service.realizarDeposito).toHaveBeenCalledTimes(4);
    });
  });

  describe('Integración de flujos completos', () => {
    it('debería manejar flujo completo: crear, depositar, retirar', async () => {
      // 1. Crear cuenta
      mockCuentasService.crearCuenta.mockResolvedValue(mockCuentaResponse);
      const cuentaCreada = await controller.crearCuenta(mockCuentaRequest);
      expect(cuentaCreada.saldo).toBe(1000);

      // 2. Depositar
      const cuentaConDeposito = { ...mockCuentaResponse, saldo: 1500 };
      mockCuentasService.realizarDeposito.mockResolvedValue(cuentaConDeposito);
      const despuesDeposito = await controller.realizarDeposito(cuentaCreada.id, 500);
      expect(despuesDeposito.saldo).toBe(1500);

      // 3. Retirar
      const cuentaConRetiro = { ...mockCuentaResponse, saldo: 1200 };
      mockCuentasService.realizarRetiro.mockResolvedValue(cuentaConRetiro);
      const despuesRetiro = await controller.realizarRetiro(cuentaCreada.id, 300);
      expect(despuesRetiro.saldo).toBe(1200);
    });

    it('debería obtener cuenta después de operaciones', async () => {
      mockCuentasService.obtenerCuenta.mockResolvedValue(mockCuentaResponse);

      const cuenta = await controller.obtenerCuenta(mockCuentaResponse.id);

      expect(cuenta).toBeDefined();
      expect(cuenta.id).toBe(mockCuentaResponse.id);
    });
  });
});
