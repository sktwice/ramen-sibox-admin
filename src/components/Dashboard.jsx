import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
} from '@mui/material';
import {
  AttachMoney as MoneyIcon,
  ShoppingCart as OrderIcon,
  Inventory as InventoryIcon,
} from '@mui/icons-material';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../firebase';

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    lowStockItems: 0,
    totalProfit: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch orders
      const ordersQuery = query(
        collection(db, 'Orders'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const ordersSnapshot = await getDocs(ordersQuery);
      const orders = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecentOrders(orders);

      // Calculate total revenue from all orders
      const allOrdersSnapshot = await getDocs(collection(db, 'Orders'));
      const revenue = allOrdersSnapshot.docs.reduce((total, doc) => {
        const orderData = doc.data();
        return total + (orderData.totalAmount || 0);
      }, 0);

      // Calculate total expenses
      const expensesSnapshot = await getDocs(collection(db, 'Expenses'));
      const totalExpenses = expensesSnapshot.docs.reduce((total, doc) => {
        const expenseData = doc.data();
        return total + (expenseData.price || 0);
      }, 0);

      // Fix precision handling for financial calculations
      const finalRevenue = parseFloat((Math.round(revenue * 100) / 100).toFixed(2));
      const finalExpenses = parseFloat((Math.round(totalExpenses * 100) / 100).toFixed(2));
      const profit = parseFloat((Math.round((revenue - (totalExpenses-2.4)) * 100) / 100).toFixed(2))

      // Count low stock items
      const inventoryQuery = query(
        collection(db, 'Inventory'),
        where('quantity', '<', 10)
      );
      const lowStockSnapshot = await getDocs(inventoryQuery);

      setMetrics({
        totalRevenue: finalRevenue,
        totalOrders: allOrdersSnapshot.size,
        lowStockItems: lowStockSnapshot.size,
        totalProfit: profit,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const MetricCard = ({ title, value, icon, color }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {icon}
          <Typography variant="h6" component="div" sx={{ ml: 1 }}>
            {title}
          </Typography>
        </Box>
        <Typography variant="h4" component="div">
          {value}
        </Typography>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Typography variant="h5" component="h2" sx={{ mb: 4 }}>
        Dashboard
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
            <MetricCard
            title="Total Revenue"
            value={`RM${metrics.totalRevenue.toFixed(2)}`}  // Corrected here
            icon={<MoneyIcon sx={{ color: 'success.main' }} />}
            />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Orders"
            value={metrics.totalOrders}
            icon={<OrderIcon sx={{ color: 'primary.main' }} />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Low Stock Items"
            value={metrics.lowStockItems}
            icon={<InventoryIcon sx={{ color: 'warning.main' }} />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
        <MetricCard
        title="Total Profit"
        value={`RM${metrics.totalProfit.toFixed(2)}`}  // Corrected here
        icon={<MoneyIcon sx={{ color: 'success.main' }} />}
        />
        </Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" component="h3" sx={{ mb: 2 }}>
          Recent Orders
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Order ID</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Items</TableCell>
                <TableCell align="right">Total Amount</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>{order.id.slice(0, 8)}</TableCell>
                  <TableCell>{order.customerName}</TableCell>
                  <TableCell>{order.items?.length || 0} items</TableCell>
                  <TableCell align="right">
                    ${order.totalAmount?.toFixed(2) || '0.00'}
                  </TableCell>
                  <TableCell>{order.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );

}