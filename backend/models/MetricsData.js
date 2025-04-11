const mongoose = require('mongoose');

const MetricsDataSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true
    },
    adAccountId: {
      type: String,
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    level: {
      type: String,
      enum: ['account', 'campaign', 'adset', 'ad'],
      required: true
    },
    objectId: {
      type: String,
      required: true
    },
    objectName: {
      type: String
    },
    metrics: {
      impressions: Number,
      clicks: Number,
      spend: Number,
      cpc: Number,
      cpm: Number,
      ctr: Number,
      reach: Number,
      frequency: Number,
      unique_clicks: Number,
      unique_ctr: Number,
      cost_per_unique_click: Number,
      conversions: Number,
      cost_per_conversion: Number,
      conversion_rate: Number,
      // Novos campos para armazenar dados de compras e au00e7u00f5es
      purchases: Number,
      actions: [{
        action_type: String,
        value: Number
      }]
    },
    // Campo para armazenar qualquer métrica adicional fornecida pela API
    additionalMetrics: {
      type: Map,
      of: mongoose.Schema.Types.Mixed
    },
    // Metadados sobre a sincronização
    syncInfo: {
      syncedAt: {
        type: Date,
        default: Date.now
      },
      syncStatus: {
        type: String,
        enum: ['success', 'partial', 'failed'],
        default: 'success'
      },
      syncMessage: String
    }
  },
  {
    timestamps: true
  }
);

// Índices para otimizar consultas
MetricsDataSchema.index({ company: 1, adAccountId: 1, date: 1 });
MetricsDataSchema.index({ level: 1, objectId: 1 });
MetricsDataSchema.index({ date: 1 });

const MetricsData = mongoose.model('MetricsData', MetricsDataSchema);

module.exports = MetricsData;
