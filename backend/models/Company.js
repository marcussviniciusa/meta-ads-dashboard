const mongoose = require('mongoose');

const CompanySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    contactEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    contactPhone: {
      type: String,
      trim: true
    },
    logo: {
      type: String // URL da imagem do logotipo
    },
    active: {
      type: Boolean,
      default: true
    },
    metaAdAccounts: [
      {
        accountId: {
          type: String,
          required: true
        },
        name: String,
        accessToken: String,
        status: {
          type: String,
          enum: ['active', 'inactive', 'error'],
          default: 'active'
        },
        lastSync: Date,
        syncStatus: {
          type: String,
          enum: ['syncing', 'completed', 'failed', 'pending'],
          default: 'pending'
        },
        syncError: String
      }
    ]
  },
  { timestamps: true }
);

const Company = mongoose.model('Company', CompanySchema);

module.exports = Company;
