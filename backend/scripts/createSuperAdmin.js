const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

// Dados do Superadmin
const superAdmin = {
  name: 'Administrador',
  email: 'admin@metaads.com',
  password: 'Adm1n@2025',
  role: 'superadmin'
};

// Conectar ao MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  try {
    console.log('MongoDB conectado');
    
    // Verificar se já existe um usuário com este email
    const existingUser = await User.findOne({ email: superAdmin.email });
    
    if (existingUser) {
      console.log('Usuário já existe. Atualizando para superadmin...');
      existingUser.role = 'superadmin';
      await existingUser.save();
      console.log(`Usuário atualizado: ${existingUser.email} (${existingUser.role})`);
    } else {
      // Criar o superadmin
      const newUser = await User.create(superAdmin);
      console.log(`Superadmin criado com sucesso: ${newUser.email}`);
      console.log('Credenciais:');
      console.log(`- Email: ${superAdmin.email}`);
      console.log(`- Senha: ${superAdmin.password}`);
    }
  } catch (error) {
    console.error('Erro ao criar superadmin:', error);
  } finally {
    // Fechar a conexão
    mongoose.connection.close();
    console.log('Conexão fechada');
  }
})
.catch(err => {
  console.error('Erro ao conectar ao MongoDB:', err);
});
