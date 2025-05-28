
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const supabase = require('./supabase');

const app = express();
app.use(express.static('public'));
app.use(cors());
app.use(express.json());


app.get('/sales/latest', async (req, res) => {
  const { data, error } = await supabase
    .from('sales')
    .select('id, block_id, amount, created_at, blocks(block_code)')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) return res.status(500).json({ error });

  if (!data) return res.status(404).json({ error: 'No sales found' });

  res.json({
    block_code: data.blocks.block_code,
    amount: data.amount,
    timestamp: data.created_at,
  });
});

app.get('/blocks', async (req, res) => {
  const { data, error } = await supabase.from('blocks').select('*');
  if (error) return res.status(500).json({ error });
  res.json(data);
});

app.patch('/blocks/:id', async (req, res) => {
  const { price, is_available, stock } = req.body;
  const { id } = req.params;
  const { data, error } = await supabase
    .from('blocks')
    .update({ price, is_available, stock })
    .eq('id', id);
  if (error) return res.status(500).json({ error });
  res.json(data);
});

app.post('/sales', async (req, res) => {
  const { block_id, amount } = req.body;

  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert([{ block_id, amount }]);

  if (saleError) return res.status(500).json({ error: saleError });

  const { data: block, error: blockError } = await supabase
    .from('blocks')
    .select('stock')
    .eq('id', block_id)
    .single();

  if (blockError) return res.status(500).json({ error: blockError });

  const newStock = block.stock - 1;
  const isAvailable = newStock > 0;

  const { error: updateError } = await supabase
    .from('blocks')
    .update({ stock: newStock, is_available: isAvailable })
    .eq('id', block_id);

  if (updateError) return res.status(500).json({ error: updateError });

  res.json({ sale, newStock });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`SmartLocker API running on http://localhost:${PORT}`);
});
