import { Cuenta } from './cuenta.entity';

describe('Cuenta Entity', () => {
  let cuenta: Cuenta;

  beforeEach(() => {
    cuenta = new Cuenta();
  });

  it('should be defined', () => {
    expect(cuenta).toBeDefined();
  });

  describe('generateId', () => {
    it('debería generar un ID UUID si no existe', () => {
      cuenta.id = undefined;
      cuenta.generateId();

      expect(cuenta.id).toBeDefined();
      expect(cuenta.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('no debería sobrescribir un ID existente', () => {
      const idExistente = '123e4567-e89b-12d3-a456-426614174000';
      cuenta.id = idExistente;
      cuenta.generateId();

      expect(cuenta.id).toBe(idExistente);
    });

    it('debería generar IDs únicos para diferentes instancias', () => {
      const cuenta1 = new Cuenta();
      const cuenta2 = new Cuenta();
      
      cuenta1.generateId();
      cuenta2.generateId();

      expect(cuenta1.id).toBeDefined();
      expect(cuenta2.id).toBeDefined();
      expect(cuenta1.id).not.toBe(cuenta2.id);
    });
  });

  describe('Propiedades de la entidad', () => {
    it('debería permitir asignar y leer todas las propiedades', () => {
      cuenta.id = '123e4567-e89b-12d3-a456-426614174000';
      cuenta.socioId = '456e7890-e89b-12d3-a456-426614174111';
      cuenta.numeroCuenta = '001-123456789';
      cuenta.saldo = 1000.50;
      cuenta.estado = 'ACTIVA';
      cuenta.tipoCuenta = 'AHORRO';
      cuenta.activo = true;

      expect(cuenta.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(cuenta.socioId).toBe('456e7890-e89b-12d3-a456-426614174111');
      expect(cuenta.numeroCuenta).toBe('001-123456789');
      expect(cuenta.saldo).toBe(1000.50);
      expect(cuenta.estado).toBe('ACTIVA');
      expect(cuenta.tipoCuenta).toBe('AHORRO');
      expect(cuenta.activo).toBe(true);
    });

    it('debería permitir diferentes estados', () => {
      const estados = ['ACTIVA', 'SUSPENDIDA', 'CANCELADA'];

      estados.forEach(estado => {
        cuenta.estado = estado;
        expect(cuenta.estado).toBe(estado);
      });
    });

    it('debería manejar diferentes tipos de cuenta', () => {
      const tiposCuenta = ['AHORRO', 'CORRIENTE', 'PLAZO_FIJO'];

      tiposCuenta.forEach(tipo => {
        cuenta.tipoCuenta = tipo;
        expect(cuenta.tipoCuenta).toBe(tipo);
      });
    });

    it('debería permitir saldos decimales', () => {
      const saldos = [0, 100.50, 1000.99, 999999999.99];

      saldos.forEach(saldo => {
        cuenta.saldo = saldo;
        expect(cuenta.saldo).toBe(saldo);
      });
    });

    it('debería manejar fechas correctamente', () => {
      const fecha = new Date('2024-01-01');
      cuenta.fechaCreacion = fecha;
      cuenta.fechaActualizacion = fecha;

      expect(cuenta.fechaCreacion).toEqual(fecha);
      expect(cuenta.fechaActualizacion).toEqual(fecha);
    });
  });

  describe('Escenarios de negocio', () => {
    it('debería representar una cuenta activa nueva', () => {
      cuenta.id = '123e4567-e89b-12d3-a456-426614174000';
      cuenta.socioId = '456e7890';
      cuenta.numeroCuenta = '001-123456';
      cuenta.saldo = 0;
      cuenta.estado = 'ACTIVA';
      cuenta.tipoCuenta = 'AHORRO';
      cuenta.activo = true;

      expect(cuenta.activo).toBe(true);
      expect(cuenta.estado).toBe('ACTIVA');
      expect(cuenta.saldo).toBe(0);
    });

    it('debería representar una cuenta suspendida', () => {
      cuenta.estado = 'SUSPENDIDA';
      cuenta.activo = true;

      expect(cuenta.estado).toBe('SUSPENDIDA');
    });

    it('debería representar una cuenta cancelada', () => {
      cuenta.estado = 'CANCELADA';
      cuenta.activo = false;

      expect(cuenta.estado).toBe('CANCELADA');
      expect(cuenta.activo).toBe(false);
    });
  });
});
