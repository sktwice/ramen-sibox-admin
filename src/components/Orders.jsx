import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Alert,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [addons, setAddons] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({
    customer_name: '',
    room_number: '',
    product_id: '',
    quantity: 1,
    add_on_id: '',
    payment_type: 'Cash',
    order_type: 'Self Pickup',
    status: 'Pending',
    order_date: new Date()
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchInventory(), fetchAddons()]);
      await fetchOrders();
    };
    loadData();
  }, []);


  const fetchOrders = async () => {
    try {
      // Get inventory and add-ons data first
      const [inventorySnapshot, addonsSnapshot] = await Promise.all([
        getDocs(collection(db, 'Inventory')),
        getDocs(collection(db, 'AddOn'))
      ]);

      const inventoryMap = new Map(inventorySnapshot.docs.map(doc => [doc.id, doc.data()]));
      const addonsMap = new Map(addonsSnapshot.docs.map(doc => [doc.id, doc.data()]));

      const q = query(collection(db, 'Orders'), orderBy('order_date', 'desc'));
      const querySnapshot = await getDocs(q);
      const ordersData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const product = inventoryMap.get(data.product_id);
        const addon = data.add_on_id ? addonsMap.get(data.add_on_id) : null;
        
        const productPrice = product?.price || 0;
        const addonValue = addon?.value || 0;
        const totalAmount = (productPrice + addonValue) * data.quantity;

        return {
          id: doc.id,
          ...data,
          order_date: data.order_date?.toDate() || new Date(),
          totalAmount
        };
      });
      setOrders(ordersData);
    } catch (err) {
      setError('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'Inventory'));
      setInventory(querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    } catch (err) {
      setError('Failed to fetch inventory');
    }
  };

  const fetchAddons = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'AddOn'));
      setAddons(querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    } catch (err) {
      setError('Failed to fetch add-ons');
    }
  };

  const handleClickOpen = () => {
    setFormData({
      customer_name: '',
      room_number: '',
      product_id: '',
      quantity: 1,
      add_on_id: '',
      payment_type: 'Cash',
      order_type: 'Self Pickup',
      status: 'Pending'
    });
    setEditingId(null);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setError('');
  };

  const handleEdit = (order) => {
    setFormData({
      status: order.status
    });
    setEditingId(order.id);
    setOpen(true);
  };

  const calculateTotal = (quantity, productId, addonId) => {
    const product = inventory.find(item => item.id === productId);
    const addon = addonId ? addons.find(addon => addon.id === addonId) : null;
    
    const productPrice = product?.price || 0;
    const addonValue = addon?.value || 0;
    return (productPrice + addonValue) * quantity;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (editingId) {
        const orderData = {
          status: formData.status
        };
        await updateDoc(doc(db, 'Orders', editingId), orderData);
        setOrders(orders.map(order =>
          order.id === editingId ? { ...order, ...orderData } : order
        ));
      } else {
        const product = inventory.find(item => item.id === formData.product_id);
        const addon = formData.add_on_id ? addons.find(addon => addon.id === formData.add_on_id) : null;
        
        const productPrice = product?.price || 0;
        const addonValue = addon?.value || 0;
        const totalAmount = (productPrice + addonValue) * formData.quantity;

        const orderData = {
          customer_name: formData.customer_name,
          room_number: formData.room_number,
          product_id: formData.product_id,
          quantity: formData.quantity,
          add_on_id: formData.add_on_id,
          payment_type: formData.payment_type,
          order_type: formData.order_type,
          status: 'Pending',
          order_date: new Date(),
          totalAmount
        };

        const docRef = await addDoc(collection(db, 'Orders'), orderData);
        setOrders([{ id: docRef.id, ...orderData }, ...orders]);
      }
      handleClose();
    } catch (err) {
      setError(editingId ? 'Failed to update order' : 'Failed to add order');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'warning';
      case 'Processing': return 'info';
      case 'Completed': return 'success';
      case 'Cancelled': return 'error';
      default: return 'default';
    }
  };

  const [paymentFilter, setPaymentFilter] = useState('all');

  const filteredOrders = orders.filter(order =>
    order.customer_name.toLowerCase().includes(search.toLowerCase()) &&
    (paymentFilter === 'all' || order.payment_type === paymentFilter)
  );

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="h2">
          Orders Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleClickOpen}
        >
          Add Order
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          sx={{ flex: 1 }}
          variant="outlined"
          label="Search Orders"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Payment Type</InputLabel>
          <Select
            value={paymentFilter}
            label="Payment Type"
            onChange={(e) => setPaymentFilter(e.target.value)}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="Cash">Cash</MenuItem>
            <MenuItem value="Online">Online</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Customer</TableCell>
              <TableCell>Product</TableCell>
              <TableCell align="right">Quantity</TableCell>
              <TableCell>Add-on</TableCell>
              <TableCell>Payment</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="right">Total Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Date</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  {order.customer_name}
                  {order.room_number && (
                    <Typography variant="caption" display="block" color="textSecondary">
                      Room: {order.room_number}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  {inventory.find(item => item.id === order.product_id)?.name || 'Unknown'}
                </TableCell>
                <TableCell align="right">{order.quantity}</TableCell>
                <TableCell>
                  {addons.find(addon => addon.id === order.add_on_id)?.name || '-'}
                </TableCell>
                <TableCell>{order.payment_type}</TableCell>
                <TableCell>{order.order_type}</TableCell>
                <TableCell align="right">RM{order.totalAmount?.toFixed(2)}</TableCell>
                <TableCell>
                  <Chip
                    label={order.status}
                    color={getStatusColor(order.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {order.order_date.toLocaleDateString()}
                  <Typography variant="caption" display="block" color="textSecondary">
                    {order.order_date.toLocaleTimeString()}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <IconButton onClick={() => handleEdit(order)}>
                    <EditIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={6}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Total Amount (All Orders)
                </Typography>
              </TableCell>
              <TableCell align="right" colSpan={4}>
                <Typography variant="subtitle1" fontWeight="bold">
                  RM{filteredOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0).toFixed(2)}
                </Typography>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Edit Order Status' : 'Create New Order'}</DialogTitle>
        <DialogContent>
          {!editingId && (
            <>
              <TextField
                margin="dense"
                label="Customer Name"
                type="text"
                fullWidth
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              />
              <TextField
                margin="dense"
                label="Room Number"
                type="text"
                fullWidth
                value={formData.room_number}
                onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
              />
              <FormControl fullWidth margin="dense">
                <InputLabel>Product</InputLabel>
                <Select
                  value={formData.product_id}
                  label="Product"
                  onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                >
                  {inventory.map((item) => (
                    <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                margin="dense"
                label="Quantity"
                type="number"
                fullWidth
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: Math.max(1, parseInt(e.target.value)) })}
              />
              <FormControl fullWidth margin="dense">
                <InputLabel>Add-on</InputLabel>
                <Select
                  value={formData.add_on_id}
                  label="Add-on"
                  onChange={(e) => setFormData({ ...formData, add_on_id: e.target.value })}
                >
                  <MenuItem value="">None</MenuItem>
                  {addons.map((addon) => (
                    <MenuItem key={addon.id} value={addon.id}>{addon.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth margin="dense">
                <InputLabel>Payment Type</InputLabel>
                <Select
                  value={formData.payment_type}
                  label="Payment Type"
                  onChange={(e) => setFormData({ ...formData, payment_type: e.target.value })}
                >
                  <MenuItem value="Cash">Cash</MenuItem>
                  <MenuItem value="Online">Online</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth margin="dense">
                <InputLabel>Order Type</InputLabel>
                <Select
                  value={formData.order_type}
                  label="Order Type"
                  onChange={(e) => setFormData({ ...formData, order_type: e.target.value })}
                >
                  <MenuItem value="Self Pickup">Self Pickup</MenuItem>
                  <MenuItem value="Delivery">Delivery</MenuItem>
                </Select>
              </FormControl>
            </>
          )}
          {editingId && (
            <FormControl fullWidth margin="dense">
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                label="Status"
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <MenuItem value="Pending">Pending</MenuItem>
                <MenuItem value="Processing">Processing</MenuItem>
                <MenuItem value="Completed">Completed</MenuItem>
                <MenuItem value="Cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingId ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
