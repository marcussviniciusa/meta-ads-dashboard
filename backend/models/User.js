const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      required: function() {
        // Senha é obrigatória apenas se não houver autenticação pelo Meta
        return !this.meta || !this.meta.id;
      },
      minlength: 6
    },
    role: {
      type: String,
      enum: ['user', 'superadmin'],
      default: 'user'
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company'
    },
    meta: {
      id: String,
      accessToken: String,
      refreshToken: String,
      tokenExpires: Date
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLogin: Date
  },
  { timestamps: true }
);

// Método para validar senha
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Middleware para hash da senha antes de salvar
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model('User', UserSchema);

module.exports = User;
