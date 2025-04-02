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
  Tooltip,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

export default function AddOns() {
  const [addons, setAddons] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    value: '',
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchAddons();
  }, []);

  const fetchAddons = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'AddOn'));
      const addonsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAddons(addonsData);
    } catch (err) {
      setError('Failed to fetch add-ons');
    } finally {
      setLoading(false);
    }
  };

  const handleClickOpen = () => {
    setFormData({ name: '', value: '' });
    setEditingId(null);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setError('');
  };

  const handleEdit = (addon) => {
    setFormData({
      name: addon.name,
      value: addon.value,
    });
    setEditingId(addon.id);
    setOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'AddOn', id));
      setAddons(addons.filter(addon => addon.id !== id));
    } catch (err) {
      setError('Failed to delete add-on');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const addonData = {
      name: formData.name,
      value: Number(formData.value),
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'AddOn', editingId), addonData);
        setAddons(addons.map(addon => 
          addon.id === editingId ? { ...addon, ...addonData } : addon
        ));
      } else {
        const docRef = await addDoc(collection(db, 'AddOn'), addonData);
        setAddons([...addons, { id: docRef.id, ...addonData }]);
      }
      handleClose();
    } catch (err) {
      setError(editingId ? 'Failed to update add-on' : 'Failed to add add-on');
    }
  };

  const filteredAddons = addons.filter(addon =>
    addon.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="h2">
          Add-ons Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleClickOpen}
        >
          Add Add-on
        </Button>
      </Box>

      <TextField
        fullWidth
        variant="outlined"
        label="Search Add-ons"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2 }}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell align="right">Value</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAddons.map((addon) => (
              <TableRow key={addon.id}>
                <TableCell>{addon.name}</TableCell>
                <TableCell align="right">RM {addon.value.toFixed(2)}</TableCell>
                <TableCell align="center">
                  <Tooltip title="Edit">
                    <IconButton onClick={() => handleEdit(addon)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton onClick={() => handleDelete(addon.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{editingId ? 'Edit Add-on' : 'Add New Add-on'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            type="text"
            fullWidth
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Value"
            type="number"
            fullWidth
            value={formData.value}
            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingId ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}