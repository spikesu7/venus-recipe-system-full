const database = require('../utils/database');

class Campus {
  static async getAll() {
    const sql = 'SELECT * FROM campuses ORDER BY name';
    try {
      return await database.all(sql);
    } catch (error) {
      console.error('Error getting campuses:', error);
      throw error;
    }
  }

  static async getById(id) {
    const sql = 'SELECT * FROM campuses WHERE id = ?';
    try {
      return await database.get(sql, [id]);
    } catch (error) {
      console.error('Error getting campus by id:', error);
      throw error;
    }
  }

  static async getByCode(code) {
    const sql = 'SELECT * FROM campuses WHERE code = ?';
    try {
      return await database.get(sql, [code]);
    } catch (error) {
      console.error('Error getting campus by code:', error);
      throw error;
    }
  }

  static async create(campusData) {
    const { name, code, address, capacity } = campusData;
    const sql = 'INSERT INTO campuses (name, code, address, capacity) VALUES (?, ?, ?, ?)';
    try {
      return await database.run(sql, [name, code, address, capacity]);
    } catch (error) {
      console.error('Error creating campus:', error);
      throw error;
    }
  }

  static async update(id, campusData) {
    const { name, code, address, capacity } = campusData;
    const sql = 'UPDATE campuses SET name = ?, code = ?, address = ?, capacity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    try {
      return await database.run(sql, [name, code, address, capacity, id]);
    } catch (error) {
      console.error('Error updating campus:', error);
      throw error;
    }
  }

  static async delete(id) {
    const sql = 'DELETE FROM campuses WHERE id = ?';
    try {
      return await database.run(sql, [id]);
    } catch (error) {
      console.error('Error deleting campus:', error);
      throw error;
    }
  }
}

module.exports = Campus;