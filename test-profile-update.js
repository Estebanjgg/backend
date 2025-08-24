// Script de prueba para debugging del updateProfile
const supabase = require('./config/supabase');

async function testProfileUpdate() {
  try {
    console.log('🧪 Iniciando test de actualización de perfil...');
    
    // Simular datos que llegan desde el frontend
    const testData1 = {
      first_name: 'Test User',
      last_name: 'Updated',
      phone: '123456789'
    };
    
    const testData2 = {
      first_name: undefined,
      last_name: undefined,
      phone: undefined
    };
    
    const testData3 = {
      first_name: '',
      last_name: '',
      phone: ''
    };
    
    console.log('\n📊 Test 1 - Datos válidos:');
    console.log('Input:', testData1);
    testUpdateLogic(testData1);
    
    console.log('\n📊 Test 2 - Datos undefined (problema actual):');
    console.log('Input:', testData2);
    testUpdateLogic(testData2);
    
    console.log('\n📊 Test 3 - Datos string vacío:');
    console.log('Input:', testData3);
    testUpdateLogic(testData3);
    
  } catch (error) {
    console.error('❌ Error en test:', error);
  }
}

function testUpdateLogic(updateData) {
  console.log('updateProfile recibió:', updateData);
  const allowedFields = ['first_name', 'last_name', 'phone'];
  const updates = {};
  
  // Solo permitir campos específicos
  for (const field of allowedFields) {
    if (updateData.hasOwnProperty(field)) {
      const value = updateData[field];
      console.log(`Procesando campo ${field}: '${value}' (tipo: ${typeof value})`);
      
      // Para todos los campos, permitir valores empios pero no undefined/null sin intención
      if (typeof value === 'string') {
        const trimmedValue = value.trim();
        
        // Para nombres, requerir que tengan contenido si se proporcionan
        if (field === 'first_name' || field === 'last_name') {
          if (trimmedValue.length > 0) {
            updates[field] = trimmedValue;
          }
        } else if (field === 'phone') {
          // Para phone, permitir valores vacíos (se guarda como null o string vacío)
          updates[field] = trimmedValue.length > 0 ? trimmedValue : null;
        }
      }
    } else {
      console.log(`Campo ${field} no está presente en updateData`);
    }
  }

  console.log('Updates finales:', updates);
  
  // Verificar que al menos haya un campo para actualizar
  if (Object.keys(updates).length === 0) {
    console.log('❌ No hay campos válidos para actualizar');
  } else {
    console.log('✅ Actualización procedería con:', updates);
  }
  
  console.log('---');
}

// Ejecutar test
testProfileUpdate();
