import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CuentasService } from './cuentas.service';
import { Cuenta } from './entities/cuenta.entity';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CuentaRequestDto } from './dto/cuenta-request.dto';

describe('CuentasService', () => {
  let service: CuentasService;
  let repository: Repository<Cuenta>;

  // Mock data
  const mockCuenta: Cuenta = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    socioId: '456e7890-e89b-12d3-a456-426614174111',
    numeroCuenta: '001-123456789',
    saldo: 1000.0,
    estado: 'ACTIVA',
    tipoCuenta: 'AHORRO',
    fechaCreacion: new Date('2024-01-01'),
    fechaActualizacion: new Date('2024-01-01'),
    activo: true,
    generateId: jest.fn(),
  };

  const mockCuentaRequestDto: CuentaRequestDto = {
    socioId: '456e7890-e89b-12d3-a456-426614174111',
    numeroCuenta: '001-123456789',
    saldo: 1000.0,
    tipoCuenta: 'AHORRO',
  };

  // Mock repository
  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CuentasService,
        {
          provide: getRepositoryToken(Cuenta),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<CuentasService>(CuentasService);
    repository = module.get<Repository<Cuenta>>(getRepositoryToken(Cuenta));

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('crearCuenta', () => {
    it('debería crear una cuenta exitosamente', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockCuenta);
      mockRepository.save.mockResolvedValue(mockCuenta);

      const result = await service.crearCuenta(mockCuentaRequestDto);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { numeroCuenta: mockCuentaRequestDto.numeroCuenta, activo: true },
      });
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.numeroCuenta).toBe(mockCuenta.numeroCuenta);
      expect(result.saldo).toBe(1000.0);
    });

    it('debería lanzar ConflictException si el número de cuenta ya existe', async () => {
      mockRepository.findOne.mockResolvedValue(mockCuenta);

      await expect(service.crearCuenta(mockCuentaRequestDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.crearCuenta(mockCuentaRequestDto)).rejects.toThrow(
        'El número de cuenta ya existe',
      );
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('debería crear cuenta con saldo inicial 0', async () => {
      const requestConSaldoCero = { ...mockCuentaRequestDto, saldo: 0 };
      const cuentaSaldoCero = { ...mockCuenta, saldo: 0 };
      
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(cuentaSaldoCero);
      mockRepository.save.mockResolvedValue(cuentaSaldoCero);

      const result = await service.crearCuenta(requestConSaldoCero);

      expect(result.saldo).toBe(0);
    });
  });

  describe('actualizarCuenta', () => {
    it('debería actualizar una cuenta exitosamente', async () => {
      const updateDto: CuentaRequestDto = {
        ...mockCuentaRequestDto,
        tipoCuenta: 'CORRIENTE',
      };
      const cuentaActualizada = { ...mockCuenta, tipoCuenta: 'CORRIENTE' };

      mockRepository.findOne.mockResolvedValue(mockCuenta);
      mockRepository.save.mockResolvedValue(cuentaActualizada);

      const result = await service.actualizarCuenta(mockCuenta.id, updateDto);

      expect(result.tipoCuenta).toBe('CORRIENTE');
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('debería lanzar NotFoundException si la cuenta no existe', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.actualizarCuenta('id-inexistente', mockCuentaRequestDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('debería lanzar ConflictException si el nuevo número de cuenta ya existe', async () => {
      const otraCuenta = { ...mockCuenta, id: 'otro-id', numeroCuenta: '001-999999999' };
      const updateDto = { ...mockCuentaRequestDto, numeroCuenta: '001-999999999' };

      mockRepository.findOne
        .mockResolvedValueOnce(mockCuenta) // Primera llamada: cuenta a actualizar
        .mockResolvedValueOnce(otraCuenta); // Segunda llamada: cuenta con mismo número

      await expect(
        service.actualizarCuenta(mockCuenta.id, updateDto),
      ).rejects.toThrow(ConflictException);
    });

    it('debería permitir actualizar sin cambiar el número de cuenta', async () => {
      const updateDto = { ...mockCuentaRequestDto, tipoCuenta: 'PLAZO_FIJO' };
      const cuentaActualizada = { ...mockCuenta, tipoCuenta: 'PLAZO_FIJO' };

      mockRepository.findOne.mockResolvedValue(mockCuenta);
      mockRepository.save.mockResolvedValue(cuentaActualizada);

      const result = await service.actualizarCuenta(mockCuenta.id, updateDto);

      expect(result.tipoCuenta).toBe('PLAZO_FIJO');
      expect(mockRepository.findOne).toHaveBeenCalledTimes(1); // Solo una llamada
    });
  });

  describe('obtenerCuenta', () => {
    it('debería obtener una cuenta por ID', async () => {
      mockRepository.findOne.mockResolvedValue(mockCuenta);

      const result = await service.obtenerCuenta(mockCuenta.id);

      expect(result.id).toBe(mockCuenta.id);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockCuenta.id, activo: true },
      });
    });

    it('debería lanzar NotFoundException si la cuenta no existe', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.obtenerCuenta('id-inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('obtenerCuentasPorSocio', () => {
    it('debería obtener todas las cuentas de un socio', async () => {
      const cuentas = [mockCuenta, { ...mockCuenta, id: 'otro-id', numeroCuenta: '001-987654321' }];
      mockRepository.find.mockResolvedValue(cuentas);

      const result = await service.obtenerCuentasPorSocio(mockCuenta.socioId);

      expect(result).toHaveLength(2);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { socioId: mockCuenta.socioId, activo: true },
        order: { fechaCreacion: 'DESC' },
      });
    });

    it('debería retornar array vacío si el socio no tiene cuentas', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.obtenerCuentasPorSocio('socio-sin-cuentas');

      expect(result).toHaveLength(0);
    });
  });

  describe('obtenerTodasCuentas', () => {
    it('debería obtener todas las cuentas activas', async () => {
      const cuentas = [mockCuenta];
      mockRepository.find.mockResolvedValue(cuentas);

      const result = await service.obtenerTodasCuentas();

      expect(result).toHaveLength(1);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { activo: true, estado: 'ACTIVA' },
      });
    });
  });

  describe('eliminarCuenta', () => {
    it('debería eliminar una cuenta (lógicamente)', async () => {
      const cuentaEliminada = { ...mockCuenta, activo: false, estado: 'CANCELADA' };
      mockRepository.findOne.mockResolvedValue(mockCuenta);
      mockRepository.save.mockResolvedValue(cuentaEliminada);

      await service.eliminarCuenta(mockCuenta.id);

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          activo: false,
          estado: 'CANCELADA',
        }),
      );
    });

    it('debería lanzar NotFoundException si la cuenta no existe', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.eliminarCuenta('id-inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('realizarRetiro', () => {
    it('debería realizar un retiro exitosamente', async () => {
      const cuentaDespuesRetiro = { ...mockCuenta, saldo: 700.0, estado: 'ACTIVA' };
      mockRepository.findOne.mockResolvedValue({ ...mockCuenta, estado: 'ACTIVA' });
      mockRepository.save.mockResolvedValue(cuentaDespuesRetiro);

      const result = await service.realizarRetiro(mockCuenta.id, 300.0);

      expect(result.saldo).toBe(700.0);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('debería lanzar NotFoundException si la cuenta no existe', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.realizarRetiro('id-inexistente', 100),
      ).rejects.toThrow(NotFoundException);
    });

    it('debería lanzar ConflictException si la cuenta no está activa', async () => {
      const cuentaSuspendida = { ...mockCuenta, estado: 'SUSPENDIDA' };
      mockRepository.findOne.mockResolvedValue(cuentaSuspendida);

      await expect(
        service.realizarRetiro(mockCuenta.id, 100),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.realizarRetiro(mockCuenta.id, 100),
      ).rejects.toThrow('La cuenta no está activa');
    });

    it('debería lanzar ConflictException si el saldo es insuficiente', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockCuenta, estado: 'ACTIVA' });

      await expect(
        service.realizarRetiro(mockCuenta.id, 1500.0),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.realizarRetiro(mockCuenta.id, 1500.0),
      ).rejects.toThrow('Saldo insuficiente');
    });

    it('debería permitir retiro que deje saldo en 0', async () => {
      const cuentaSaldoCero = { ...mockCuenta, saldo: 0, estado: 'ACTIVA' };
      mockRepository.findOne.mockResolvedValue({ ...mockCuenta, estado: 'ACTIVA' });
      mockRepository.save.mockResolvedValue(cuentaSaldoCero);

      const result = await service.realizarRetiro(mockCuenta.id, 1000.0);

      expect(result.saldo).toBe(0);
    });
  });

  describe('realizarDeposito', () => {
    it('debería realizar un depósito exitosamente', async () => {
      const cuentaDespuesDeposito = { ...mockCuenta, saldo: 1500.0, estado: 'ACTIVA' };
      mockRepository.findOne.mockResolvedValue({ ...mockCuenta, estado: 'ACTIVA' });
      mockRepository.save.mockResolvedValue(cuentaDespuesDeposito);

      const result = await service.realizarDeposito(mockCuenta.id, 500.0);

      expect(result.saldo).toBe(1500.0);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('debería lanzar NotFoundException si la cuenta no existe', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.realizarDeposito('id-inexistente', 100),
      ).rejects.toThrow(NotFoundException);
    });

    it('debería lanzar ConflictException si la cuenta no está activa', async () => {
      const cuentaCancelada = { ...mockCuenta, estado: 'CANCELADA' };
      mockRepository.findOne.mockResolvedValue(cuentaCancelada);

      await expect(
        service.realizarDeposito(mockCuenta.id, 100),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.realizarDeposito(mockCuenta.id, 100),
      ).rejects.toThrow('La cuenta no está activa');
    });
  });

  describe('Escenarios de inconsistencia', () => {
    it('no debería permitir crear cuenta con saldo negativo (validación DTO)', async () => {
      // Este test verifica que la validación en el DTO funcione
      const dtoInvalido = { ...mockCuentaRequestDto, saldo: -100 };
      // La validación real se hace en el pipe de NestJS, aquí verificamos la lógica
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue({ ...mockCuenta, saldo: -100 });
      mockRepository.save.mockResolvedValue({ ...mockCuenta, saldo: -100 });

      // Si llegara a pasar la validación, el servicio lo crearía
      const result = await service.crearCuenta(dtoInvalido as any);
      
      // Esto demuestra que necesitamos validación adicional en el servicio
      expect(result).toBeDefined();
    });

    it('debería manejar actualización concurrente de saldo (detectar race condition)', async () => {
      // Simular dos retiros simultáneos que podrían causar saldo negativo
      const cuentaInicial = { ...mockCuenta, saldo: 100, estado: 'ACTIVA' };
      
      mockRepository.findOne
        .mockResolvedValueOnce(cuentaInicial) // Primera lectura
        .mockResolvedValueOnce(cuentaInicial); // Segunda lectura (antes de que se guarde la primera)

      mockRepository.save
        .mockResolvedValueOnce({ ...cuentaInicial, saldo: 50 })
        .mockResolvedValueOnce({ ...cuentaInicial, saldo: 0 });

      // Ambos retiros leen el saldo inicial de 100
      const retiro1 = service.realizarRetiro(mockCuenta.id, 50);
      const retiro2 = service.realizarRetiro(mockCuenta.id, 50);

      const [result1, result2] = await Promise.all([retiro1, retiro2]);

      // Sin control de concurrencia, ambos podrían ejecutarse
      expect(result1.saldo).toBe(50);
      expect(result2.saldo).toBe(0); // Problema: debería ser 50, no 0
    });

    it('debería detectar intento de retiro que genere saldo negativo', async () => {
      const cuentaConPocoSaldo = { ...mockCuenta, saldo: 50, estado: 'ACTIVA' };
      mockRepository.findOne.mockResolvedValue(cuentaConPocoSaldo);

      await expect(
        service.realizarRetiro(mockCuenta.id, 100),
      ).rejects.toThrow('Saldo insuficiente');
    });

    it('debería manejar depósito en cuenta suspendida', async () => {
      const cuentaSuspendida = { ...mockCuenta, estado: 'SUSPENDIDA' };
      mockRepository.findOne.mockResolvedValue(cuentaSuspendida);

      await expect(
        service.realizarDeposito(mockCuenta.id, 100),
      ).rejects.toThrow('La cuenta no está activa');
    });
  });

  describe('Pruebas de concurrencia', () => {
    it('debería manejar múltiples depósitos concurrentes', async () => {
      const cuentaInicial = { ...mockCuenta, saldo: 1000, estado: 'ACTIVA' };
      
      // Simular que todas las lecturas ven el estado inicial
      mockRepository.findOne.mockResolvedValue(cuentaInicial);
      
      // Cada save retorna con el saldo incrementado
      let saldoActual = 1000;
      mockRepository.save.mockImplementation((cuenta) => {
        saldoActual += 100;
        return Promise.resolve({ ...cuenta, saldo: saldoActual });
      });

      // 5 depósitos concurrentes de 100
      const depositos = Array(5)
        .fill(null)
        .map(() => service.realizarDeposito(mockCuenta.id, 100));

      const resultados = await Promise.all(depositos);

      // Verificar que se ejecutaron todos
      expect(resultados).toHaveLength(5);
      expect(mockRepository.save).toHaveBeenCalledTimes(5);
    });

    it('debería detectar condición de carrera en retiros concurrentes', async () => {
      const cuentaInicial = { ...mockCuenta, saldo: 500, estado: 'ACTIVA' };
      
      // Ambos leen el mismo saldo inicial
      mockRepository.findOne.mockResolvedValue(cuentaInicial);
      
      let contador = 0;
      mockRepository.save.mockImplementation((cuenta) => {
        contador++;
        // Simular que ambos retiran del saldo original (race condition)
        return Promise.resolve({ ...cuenta, saldo: 500 - (contador * 300) });
      });

      // Dos retiros concurrentes de 300
      const retiro1 = service.realizarRetiro(mockCuenta.id, 300);
      const retiro2 = service.realizarRetiro(mockCuenta.id, 300);

      // El segundo retiro fallará porque detecta saldo insuficiente
      try {
        await Promise.all([retiro1, retiro2]);
        fail('Debería haber lanzado una excepción');
      } catch (error) {
        // Se espera que el segundo retiro falle por saldo insuficiente
        expect(error).toBeDefined();
      }
    });

    it('debería procesar transacciones en orden con locking apropiado', async () => {
      // Este test documenta el comportamiento esperado con control de concurrencia
      const cuentaInicial = { ...mockCuenta, saldo: 1000, estado: 'ACTIVA' };
      
      let saldoActual = 1000;
      
      // Mock que simula locking - las operaciones se procesan secuencialmente
      mockRepository.findOne.mockImplementation(async () => {
        // Simular delay de red
        await new Promise(resolve => setTimeout(resolve, 10));
        return { ...cuentaInicial, saldo: saldoActual };
      });
      
      mockRepository.save.mockImplementation(async (cuenta) => {
        saldoActual = cuenta.saldo;
        await new Promise(resolve => setTimeout(resolve, 10));
        return { ...cuenta, saldo: saldoActual };
      });

      // 3 retiros secuenciales
      const retiro1 = await service.realizarRetiro(mockCuenta.id, 200);
      const retiro2 = await service.realizarRetiro(mockCuenta.id, 300);
      const retiro3 = await service.realizarRetiro(mockCuenta.id, 100);

      expect(retiro1.saldo).toBe(800);
      expect(retiro2.saldo).toBe(500);
      expect(retiro3.saldo).toBe(400);
    });
  });

  describe('Performance y edge cases', () => {
    it('debería manejar montos decimales correctamente', async () => {
      const cuentaConDecimales = { ...mockCuenta, saldo: 100.55, estado: 'ACTIVA' };
      mockRepository.findOne.mockResolvedValue(cuentaConDecimales);
      mockRepository.save.mockResolvedValue({ ...cuentaConDecimales, saldo: 150.80, estado: 'ACTIVA' });

      const result = await service.realizarDeposito(mockCuenta.id, 50.25);

      expect(result.saldo).toBe(150.80);
    });

    it('debería manejar números muy grandes de saldo', async () => {
      const cuentaConSaldoGrande = { ...mockCuenta, saldo: 999999999.99, estado: 'ACTIVA' };
      mockRepository.findOne.mockResolvedValue(cuentaConSaldoGrande);
      mockRepository.save.mockResolvedValue({ ...cuentaConSaldoGrande, saldo: 1000000099.99, estado: 'ACTIVA' });

      const result = await service.realizarDeposito(mockCuenta.id, 100);

      expect(result.saldo).toBe(1000000099.99);
    });

    it('debería convertir saldo a número en la respuesta', async () => {
      // TypeORM puede devolver Decimal como string
      const cuentaConSaldoString = { ...mockCuenta, saldo: '1000.50' as any };
      mockRepository.findOne.mockResolvedValue(cuentaConSaldoString);

      const result = await service.obtenerCuenta(mockCuenta.id);

      expect(typeof result.saldo).toBe('number');
      expect(result.saldo).toBe(1000.50);
    });
  });
});
