import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, Dimensions, 
  ActivityIndicator, TouchableOpacity, TextInput, Alert, Modal 
} from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { 
  TrendingUp, DollarSign, Users, Car, Plus, Trash2, 
  Edit3, Fuel, Tag, Briefcase, Calendar, ChevronDown, ChevronUp 
} from 'lucide-react-native';
import api from '../services/api';
import { colors } from '../theme/colors';
import { showSuccess, showError } from '../utils/toast';

const screenWidth = Dimensions.get('window').width;

const chartConfig = {
  backgroundGradientFrom: "#fff",
  backgroundGradientTo: "#fff",
  color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.5,
  useShadowColorFromDataset: false,
};

const FUEL_TYPES = ['Petrol', 'Diesel', 'Electric', 'Hybrid'];

export default function ReportsScreen() {
  const [stats, setStats] = useState(null);
  const [saleReports, setSaleReports] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showSalesList, setShowSalesList] = useState(false);

  // Form State
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [fuelType, setFuelType] = useState('Petrol');
  const [boughtPrice, setBoughtPrice] = useState('');
  const [soldPrice, setSoldPrice] = useState('');
  const [discount, setDiscount] = useState('0');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, salesRes, analyticsRes] = await Promise.all([
        api.get('/reports/dashboard'),
        api.get('/reports/sales'),
        api.get('/reports/sales/analytics')
      ]);
      setStats(statsRes.data.data);
      setSaleReports(salesRes.data.data);
      setAnalytics(analyticsRes.data.data);
    } catch (err) {
      console.log('Error fetching reports', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSale = async () => {
    if (!brand || !model || !boughtPrice || !soldPrice) {
      showError('Please fill all required fields');
      return;
    }

    const payload = {
      brand, model, fuelType,
      boughtPrice: parseFloat(boughtPrice),
      soldPrice: parseFloat(soldPrice),
      discount: parseFloat(discount || 0)
    };

    try {
      if (editingId) {
        await api.patch(`/reports/sales/${editingId}`, payload);
        showSuccess('Sale report updated');
      } else {
        await api.post('/reports/sales', payload);
        showSuccess('Sale report added');
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Action failed');
    }
  };

  const handleDeleteSale = (id) => {
    Alert.alert('Delete Sale', 'Are you sure?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/reports/sales/${id}`);
          showSuccess('Sale deleted');
          fetchData();
        } catch (err) { showError(err.response?.data?.message || err.message || 'Delete failed'); }
      }}
    ]);
  };

  const openEdit = (sale) => {
    setEditingId(sale._id);
    setBrand(sale.brand);
    setModel(sale.model);
    setFuelType(sale.fuelType);
    setBoughtPrice(sale.boughtPrice.toString());
    setSoldPrice(sale.soldPrice.toString());
    setDiscount(sale.discount.toString());
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setBrand('');
    setModel('');
    setFuelType('Petrol');
    setBoughtPrice('');
    setSoldPrice('');
    setDiscount('0');
  };

  if (loading && !stats) return <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />;

  const trendData = {
    labels: stats?.trends?.map(t => `${t._id.month}/${t._id.year.toString().slice(-2)}`) || [],
    datasets: [{ data: stats?.trends?.map(t => t.count) || [] }]
  };

  const fuelChartData = {
    labels: analytics?.profitByFuel?.map(f => f._id) || [],
    datasets: [{ data: analytics?.profitByFuel?.map(f => f.totalProfit) || [] }]
  };

  const brandChartData = {
    labels: analytics?.profitByBrand?.map(b => b._id.substring(0, 5)) || [],
    datasets: [{ data: analytics?.profitByBrand?.map(b => b.totalProfit) || [] }]
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Analytics & Insights</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => { resetForm(); setShowModal(true); }}>
          <Plus color="#fff" size={20} />
          <Text style={styles.addBtnText}>Add Sale</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.revenueCard}>
        <View style={styles.revIcon}>
          <DollarSign color="#fff" size={32} />
        </View>
        <View>
          <Text style={styles.revLabel}>Total Estimated Revenue</Text>
          <Text style={styles.revValue}>Rs {stats?.totalRevenue?.toLocaleString()}</Text>
        </View>
      </View>

      {/* Sale Reports List Toggle */}
      <TouchableOpacity 
        style={styles.sectionHeader} 
        onPress={() => setShowSalesList(!showSalesList)}
      >
        <Text style={styles.chartTitle}>Recent Sale Reports</Text>
        {showSalesList ? <ChevronUp color={colors.text} /> : <ChevronDown color={colors.text} />}
      </TouchableOpacity>

      {showSalesList && (
        <View style={styles.salesList}>
          {saleReports.length > 0 ? saleReports.map(sale => (
            <View key={sale._id} style={styles.saleItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.saleTitle}>{sale.brand} {sale.model}</Text>
                <Text style={styles.saleDetail}>{sale.fuelType} • Sold: Rs {sale.soldPrice.toLocaleString()}</Text>
                <Text style={[styles.saleProfit, { color: sale.profit >= 0 ? '#059669' : '#DC2626' }]}>
                  Profit: Rs {sale.profit.toLocaleString()}
                </Text>
              </View>
              <View style={styles.saleActions}>
                <TouchableOpacity onPress={() => openEdit(sale)} style={styles.iconBtn}>
                  <Edit3 color={colors.primary} size={18} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteSale(sale._id)} style={styles.iconBtn}>
                  <Trash2 color="#DC2626" size={18} />
                </TouchableOpacity>
              </View>
            </View>
          )) : <Text style={styles.empty}>No sale reports found</Text>}
        </View>
      )}

      {/* Analytics Charts */}
      <Text style={styles.chartTitle}>Profit by Fuel Type</Text>
      <View style={styles.chartContainer}>
        {fuelChartData.labels.length > 0 ? (
          <BarChart
            data={fuelChartData}
            width={screenWidth - 70}
            height={220}
            chartConfig={chartConfig}
            style={styles.chart}
            verticalLabelRotation={30}
          />
        ) : <Text style={styles.empty}>Add sales to see fuel analytics</Text>}
      </View>

      <Text style={styles.chartTitle}>Top Brands by Profit</Text>
      <View style={styles.chartContainer}>
        {brandChartData.labels.length > 0 ? (
          <BarChart
            data={brandChartData}
            width={screenWidth - 70}
            height={220}
            chartConfig={chartConfig}
            style={styles.chart}
          />
        ) : <Text style={styles.empty}>Add sales to see brand analytics</Text>}
      </View>

      <Text style={styles.chartTitle}>Booking Trends</Text>
      <View style={styles.chartContainer}>
        {trendData.labels.length > 0 ? (
          <LineChart
            data={trendData}
            width={screenWidth - 70}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        ) : <Text style={styles.empty}>No booking trends available</Text>}
      </View>

      {/* Add/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingId ? 'Edit Sale Report' : 'Add New Sale'}</Text>
            
            <ScrollView style={{ maxHeight: 400 }}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Brand</Text>
                <TextInput style={styles.input} value={brand} onChangeText={setBrand} placeholder="Toyota" />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Model</Text>
                <TextInput style={styles.input} value={model} onChangeText={setModel} placeholder="Camry" />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Fuel Type</Text>
                <View style={styles.fuelOptions}>
                  {FUEL_TYPES.map(f => (
                    <TouchableOpacity 
                      key={f} 
                      style={[styles.fuelChip, fuelType === f && styles.fuelChipActive]}
                      onPress={() => setFuelType(f)}
                    >
                      <Text style={[styles.fuelText, fuelType === f && styles.fuelTextActive]}>{f}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Bought Price (Rs)</Text>
                <TextInput style={styles.input} value={boughtPrice} onChangeText={setBoughtPrice} keyboardType="numeric" />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Sold Price (Rs)</Text>
                <TextInput style={styles.input} value={soldPrice} onChangeText={setSoldPrice} keyboardType="numeric" />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Discount (Rs)</Text>
                <TextInput style={styles.input} value={discount} onChangeText={setDiscount} keyboardType="numeric" />
              </View>
            </ScrollView>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSale}>
                <Text style={styles.saveText}>{editingId ? 'Update' : 'Add Sale'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundSecondary },
  content: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  addBtn: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, gap: 4 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  revenueCard: { backgroundColor: colors.text, borderRadius: 20, padding: 24, flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 30 },
  revIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  revLabel: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  revValue: { fontSize: 32, fontWeight: '800', color: '#fff', marginTop: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  chartTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
  chartContainer: { backgroundColor: colors.surface, borderRadius: 20, padding: 16, marginBottom: 30, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  chart: { borderRadius: 16, marginVertical: 8 },
  empty: { color: colors.textLight, padding: 20, textAlign: 'center' },
  salesList: { marginBottom: 30 },
  saleItem: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  saleTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  saleDetail: { fontSize: 14, color: colors.textLight, marginTop: 2 },
  saleProfit: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  saleActions: { flexDirection: 'row', gap: 10 },
  iconBtn: { padding: 8, backgroundColor: colors.backgroundSecondary, borderRadius: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 20 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: colors.textLight, marginBottom: 6 },
  input: { backgroundColor: colors.backgroundSecondary, borderRadius: 10, padding: 12, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border },
  fuelOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fuelChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  fuelChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  fuelText: { fontSize: 14, fontWeight: '600', color: colors.textLight },
  fuelTextActive: { color: '#fff' },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  cancelText: { color: colors.textLight, fontWeight: '700' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700' }
});
