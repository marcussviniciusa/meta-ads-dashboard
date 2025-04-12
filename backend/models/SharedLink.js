const mongoose = require('mongoose');
const crypto = require('crypto');

const SharedLinkSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomBytes(20).toString('hex')
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true
    },
    adAccountId: {
      type: String,
      required: true
    },
    dateRange: {
      type: {
        type: String,
        enum: ['last7days', 'last30days', 'last90days', 'custom'],
        default: 'last30days'
      },
      startDate: Date,
      endDate: Date
    },
    selectedMetrics: {
      type: [String],
      default: ['impressions', 'clicks', 'spend', 'ctr', 'cpc']
    },
    isActive: {
      type: Boolean,
      default: true
    },
    expiresAt: {
      type: Date,
      default: () => {
        const date = new Date();
        date.setDate(date.getDate() + 90); // Links expire after 90 days by default
        return date;
      }
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Método para verificar se o link expirou
SharedLinkSchema.methods.isExpired = function() {
  return this.expiresAt < new Date();
};

// Método para estender a validade do link
SharedLinkSchema.methods.extendExpiry = function(days = 30) {
  const newExpiry = new Date();
  newExpiry.setDate(newExpiry.getDate() + days);
  this.expiresAt = newExpiry;
  return this.save();
};

module.exports = mongoose.model('SharedLink', SharedLinkSchema);
