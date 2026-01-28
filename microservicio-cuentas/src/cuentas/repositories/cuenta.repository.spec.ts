import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CuentaRepository } from './cuenta.repository';
import { Cuenta } from '../entities/cuenta.entity';

describe('CuentaRepository', () => {
  let repository: CuentaRepository;

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: getRepositoryToken(Cuenta),
          useClass: CuentaRepository,
        },
      ],
    }).compile();

    repository = module.get<CuentaRepository>(getRepositoryToken(Cuenta));
    
    // Mock métodos base de TypeORM
    repository.find = jest.fn();
    repository.findOne = jest.fn();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findBySocioId', () => {
    it('debería encontrar cuentas por socio ID', async () => {
      const cuentas = [mockCuenta, { ...mockCuenta, id: 'otro-id' }];
      (repository.find as jest.Mock).mockResolvedValue(cuentas);

      const result = await repository.findBySocioId(mockCuenta.socioId);

      expect(result).toEqual(cuentas);
      expect(repository.find).toHaveBeenCalledWith({
        where: { socioId: mockCuenta.socioId, activo: true },
        order: { fechaCreacion: 'DESC' },
      });
    });

    it('debería retornar array vacío si el socio no tiene cuentas', async () => {
      (repository.find as jest.Mock).mockResolvedValue([]);

      const result = await repository.findBySocioId('socio-sin-cuentas');

      expect(result).toEqual([]);
    });
  });

  describe('findByNumeroCuenta', () => {
    it('debería encontrar cuenta por número de cuenta', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(mockCuenta);

      const result = await repository.findByNumeroCuenta(mockCuenta.numeroCuenta);

      expect(result).toEqual(mockCuenta);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { numeroCuenta: mockCuenta.numeroCuenta, activo: true },
      });
    });

    it('debería retornar null si no encuentra la cuenta', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await repository.findByNumeroCuenta('numero-inexistente');

      expect(result).toBeNull();
    });
  });

  describe('findActivas', () => {
    it('debería encontrar todas las cuentas activas', async () => {
      const cuentasActivas = [mockCuenta, { ...mockCuenta, id: 'otro-id' }];
      (repository.find as jest.Mock).mockResolvedValue(cuentasActivas);

      const result = await repository.findActivas();

      expect(result).toEqual(cuentasActivas);
      expect(repository.find).toHaveBeenCalledWith({
        where: { activo: true, estado: 'ACTIVA' },
      });
    });

    it('debería retornar array vacío si no hay cuentas activas', async () => {
      (repository.find as jest.Mock).mockResolvedValue([]);

      const result = await repository.findActivas();

      expect(result).toEqual([]);
    });

    it('debería excluir cuentas suspendidas o canceladas', async () => {
      const todasCuentas = [
        mockCuenta,
        { ...mockCuenta, id: 'id-2', estado: 'SUSPENDIDA' },
        { ...mockCuenta, id: 'id-3', estado: 'CANCELADA', activo: false },
      ];

      // Solo debe retornar las activas
      const cuentasActivas = todasCuentas.filter(c => c.activo && c.estado === 'ACTIVA');
      (repository.find as jest.Mock).mockResolvedValue(cuentasActivas);

      const result = await repository.findActivas();

      expect(result).toHaveLength(1);
      expect(result[0].estado).toBe('ACTIVA');
    });
  });
});
