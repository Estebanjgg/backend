const express = require('express');
const supabase = require('../config/supabase');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// POST /api/debug/fix-database - Ejecutar script de corrección
router.post('/fix-database', async (req, res) => {
  try {
    console.log('🔧 Ejecutando script de corrección de base de datos...');
    
    // Leer el script SQL
    const scriptPath = path.join(__dirname, '../scripts/fix-order-items-product-relation.sql');
    const script = fs.readFileSync(scriptPath, 'utf8');
    
    // Ejecutar el script
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: script 
    });
    
    if (error) {
      console.error('Error ejecutando script:', error);
      return res.status(500).json({
        success: false,
        message: 'Error ejecutando script de corrección',
        error: error
      });
    }
    
    res.json({
      success: true,
      message: 'Script de corrección ejecutado exitosamente',
      data: data
    });
    
  } catch (error) {
    console.error('Error en fix-database:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// GET /api/debug/check-schema - Verificar esquema de base de datos
router.get('/check-schema', async (req, res) => {
  try {
    console.log('🔍 Verificando esquema de base de datos...');
    
    // Verificar tipos de columnas
    const { data: columnTypes, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('table_name, column_name, data_type')
      .in('table_name', ['products', 'order_items'])
      .in('column_name', ['id', 'product_id'])
      .order('table_name, column_name');
    
    if (columnError) {
      console.error('Error verificando tipos de columnas:', columnError);
    }
    
    // Verificar foreign keys
    const { data: foreignKeys, error: fkError } = await supabase
      .from('information_schema.table_constraints')
      .select(`
        constraint_name,
        table_name,
        constraint_type
      `)
      .eq('constraint_type', 'FOREIGN KEY')
      .eq('table_name', 'order_items');
    
    if (fkError) {
      console.error('Error verificando foreign keys:', fkError);
    }
    
    res.json({
      success: true,
      data: {
        columnTypes: columnTypes || [],
        foreignKeys: foreignKeys || [],
        summary: {
          products_id_type: columnTypes?.find(c => c.table_name === 'products' && c.column_name === 'id')?.data_type,
          order_items_product_id_type: columnTypes?.find(c => c.table_name === 'order_items' && c.column_name === 'product_id')?.data_type,
          foreign_keys_count: foreignKeys?.length || 0
        }
      }
    });
    
  } catch (error) {
    console.error('Error en check-schema:', error);
    res.status(500).json({
      success: false,
      message: 'Error verificando esquema',
      error: error.message
    });
  }
});

// POST /api/debug/run-sql - Ejecutar SQL directo (solo para debug)
router.post('/run-sql', async (req, res) => {
  try {
    const { sql } = req.body;
    
    if (!sql) {
      return res.status(400).json({
        success: false,
        message: 'SQL query es requerido'
      });
    }
    
    console.log('🔧 Ejecutando SQL:', sql.substring(0, 100) + '...');
    
    const { data, error } = await supabase
      .rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('Error ejecutando SQL:', error);
      return res.status(500).json({
        success: false,
        message: 'Error ejecutando SQL',
        error: error
      });
    }
    
    res.json({
      success: true,
      data: data
    });
    
  } catch (error) {
    console.error('Error en run-sql:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

module.exports = router;
