const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const XLSX = require('xlsx');
const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static('public'));
app.use('/backups/supply', express.static('backups/supply'));
app.use('/backups/demand', express.static('backups/demand'));
app.use('/backups/bill', express.static('backups/bill'));

const pool = mysql.createPool({
    host: "sql.freedb.tech",
    user: "freedb_shasha",
    password: "&4k#jkuvvW8msCG",
    database: "freedb_test1db",
});

// Create backup directories if they don't exist
const backupDirs = {
    supply: path.join(__dirname, 'backups', 'supply'),
    demand: path.join(__dirname, 'backups', 'demand'),
    bill: path.join(__dirname, 'backups', 'bill')
};
Object.values(backupDirs).forEach(dir => fs.mkdir(dir, { recursive: true }));

// Auto-generate backup daily
async function createBackup(type) {
    const date = new Date().toISOString().split('T')[0];
    const backupFile = path.join(backupDirs[type], `backup_${date}.xlsx`);
    try {
        const [rows] = await pool.query(`SELECT * FROM ${type}_orders`);
        const formattedRows = rows.map(row => ({
            ...row,
            ...(type === 'supply' ? {
                original_date: row.original_date ? row.original_date.toISOString().split('T')[0] : '',
                revised_date1: row.revised_date1 ? row.revised_date1.toISOString().split('T')[0] : '',
                revised_date2: row.revised_date2 ? row.revised_date2.toISOString().split('T')[0] : '',
                revised_date3: row.revised_date3 ? row.revised_date3.toISOString().split('T')[0] : '',
                actual_delivery_date: row.actual_delivery_date ? row.actual_delivery_date.toISOString().split('T')[0] : ''
            } : type === 'demand' ? {
                demand_date: row.demand_date ? row.demand_date.toISOString().split('T')[0] : ''
            } : {
                entry_date: row.entry_date ? row.entry_date.toISOString().split('T')[0] : '',
                so_date: row.so_date ? row.so_date.toISOString().split('T')[0] : ''
            })
        }));
        const worksheet = XLSX.utils.json_to_sheet(formattedRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, `${type.charAt(0).toUpperCase() + type.slice(1)} Orders`);
        await fs.writeFile(backupFile, XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }));
        
        // Delete backups older than 10 days
        const files = await fs.readdir(backupDirs[type]);
        const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
        for (const file of files) {
            const filePath = path.join(backupDirs[type], file);
            const stats = await fs.stat(filePath);
            if (stats.mtime < tenDaysAgo) {
                await fs.unlink(filePath);
            }
        }
    } catch (error) {
        console.error(`Error creating ${type} backup:`, error);
    }
}

// Schedule backups every day at midnight
setInterval(() => createBackup('supply'), 24 * 60 * 60 * 1000);
setInterval(() => createBackup('demand'), 24 * 60 * 60 * 1000);
setInterval(() => createBackup('bill'), 24 * 60 * 60 * 1000);
createBackup('supply'); // Run immediately on startup
createBackup('demand');
createBackup('bill');

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'admin123') {
        res.status(200).send();
    } else {
        res.status(401).send('Invalid credentials');
    }
});

app.get('/api/supply-orders', async (req, res) => {
    const { year, sort = 'serial_no' } = req.query;
    try {
        const [rows] = await pool.query(
            `SELECT id, serial_no, supply_order_no_date, firm_name, nomenclature, quantity, 
                    DATE_FORMAT(original_date, '%Y-%m-%d') as original_date, 
                    DATE_FORMAT(revised_date1, '%Y-%m-%d') as revised_date1, 
                    DATE_FORMAT(revised_date2, '%Y-%m-%d') as revised_date2, 
                    DATE_FORMAT(revised_date3, '%Y-%m-%d') as revised_date3, 
                    build_up, maint, misc, project_no_pdc, 
                    DATE_FORMAT(actual_delivery_date, '%Y-%m-%d') as actual_delivery_date,
                    procurement_mode, delivery_done, remarks, financial_year 
             FROM supply_orders WHERE financial_year = ? ORDER BY ${sort}`,
            [year]
        );
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.get('/api/demand-orders', async (req, res) => {
    const { year, sort = 'serial_no' } = req.query;
    try {
        const [rows] = await pool.query(
            `SELECT id, serial_no, DATE_FORMAT(demand_date, '%Y-%m-%d') as demand_date, 
                    group_demand_no_date, mmg_control_no_date, nomenclature, quantity, 
                    expenditure_head, rev_cap, procurement_mode, est_cost, imms_control_no, remarks, financial_year 
             FROM demand_orders WHERE financial_year = ? ORDER BY ${sort}`,
            [year]
        );
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.get('/api/bill-orders', async (req, res) => {
    const { year, sort = 'serial_no' } = req.query;
    try {
        const [rows] = await pool.query(
            `SELECT id, serial_no, DATE_FORMAT(entry_date, '%Y-%m-%d') as entry_date, 
                    firm_name, supply_order_no, DATE_FORMAT(so_date, '%Y-%m-%d') as so_date, 
                    project_no, build_up, maintenance, project_less_2cr, project_more_2cr, 
                    procurement_mode, rev_cap, date_amount_passed, ld_amount, remarks, financial_year 
             FROM bill_orders WHERE financial_year = ? ORDER BY ${sort}`,
            [year]
        );
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.get('/api/supply-orders/max-serial', async (req, res) => {
    const { year } = req.query;
    try {
        const [rows] = await pool.query(
            'SELECT MAX(serial_no) as maxSerialNo FROM supply_orders WHERE financial_year = ?',
            [year]
        );
        res.json({ maxSerialNo: rows[0].maxSerialNo || 0 });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.get('/api/demand-orders/max-serial', async (req, res) => {
    const { year } = req.query;
    try {
        const [rows] = await pool.query(
            'SELECT MAX(serial_no) as maxSerialNo FROM demand_orders WHERE financial_year = ?',
            [year]
        );
        res.json({ maxSerialNo: rows[0].maxSerialNo || 0 });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.get('/api/bill-orders/max-serial', async (req, res) => {
    const { year } = req.query;
    try {
        const [rows] = await pool.query(
            'SELECT MAX(serial_no) as maxSerialNo FROM bill_orders WHERE financial_year = ?',
            [year]
        );
        res.json({ maxSerialNo: rows[0].maxSerialNo || 0 });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.get('/api/supply-orders/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query('SELECT * FROM supply_orders WHERE id = ?', [id]);
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).send('Not found');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.get('/api/demand-orders/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query('SELECT * FROM demand_orders WHERE id = ?', [id]);
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).send('Not found');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.get('/api/bill-orders/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query('SELECT * FROM bill_orders WHERE id = ?', [id]);
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).send('Not found');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.post('/api/supply-orders', async (req, res) => {
    const data = req.body;
    try {
        await pool.query(
            `INSERT INTO supply_orders (serial_no, supply_order_no_date, firm_name, nomenclature, quantity, 
                original_date, revised_date1, revised_date2, revised_date3, 
                build_up, maint, misc, project_no_pdc, actual_delivery_date,
                procurement_mode, delivery_done, remarks, financial_year) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.serial_no, data.supply_order_no_date, data.firm_name, data.nomenclature, data.quantity,
                data.original_date || null, data.revised_date1 || null, data.revised_date2 || null, data.revised_date3 || null,
                data.build_up, data.maint, data.misc, data.project_no_pdc, data.actual_delivery_date || null,
                data.procurement_mode, data.delivery_done, data.remarks, data.financial_year
            ]
        );
        res.status(201).send();
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.post('/api/demand-orders', async (req, res) => {
    const data = req.body;
    try {
        await pool.query(
            `INSERT INTO demand_orders (serial_no, demand_date, group_demand_no_date, mmg_control_no_date, nomenclature, quantity, 
                expenditure_head, rev_cap, procurement_mode, est_cost, imms_control_no, remarks, financial_year) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.serial_no, data.demand_date || null, data.group_demand_no_date, data.mmg_control_no_date,
                data.nomenclature, data.quantity, data.expenditure_head, data.rev_cap,
                data.procurement_mode, data.est_cost, data.imms_control_no, data.remarks, data.financial_year
            ]
        );
        res.status(201).send();
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.post('/api/bill-orders', async (req, res) => {
    const data = req.body;
    try {
        await pool.query(
            `INSERT INTO bill_orders (serial_no, entry_date, firm_name, supply_order_no, so_date, 
                project_no, build_up, maintenance, project_less_2cr, project_more_2cr, 
                procurement_mode, rev_cap, date_amount_passed, ld_amount, remarks, financial_year) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.serial_no, data.entry_date || null, data.firm_name, data.supply_order_no, data.so_date || null,
                data.project_no, data.build_up, data.maintenance, data.project_less_2cr, data.project_more_2cr,
                data.procurement_mode, data.rev_cap, data.date_amount_passed, data.ld_amount, data.remarks, data.financial_year
            ]
        );
        res.status(201).send();
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.put('/api/supply-orders/:id', async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    try {
        await pool.query(
            `UPDATE supply_orders SET serial_no = ?, supply_order_no_date = ?, firm_name = ?, nomenclature = ?, quantity = ?, 
                original_date = ?, revised_date1 = ?, revised_date2 = ?, revised_date3 = ?, 
                build_up = ?, maint = ?, misc = ?, project_no_pdc = ?, actual_delivery_date = ?,
                procurement_mode = ?, delivery_done = ?, remarks = ?, financial_year = ? 
             WHERE id = ?`,
            [
                data.serial_no, data.supply_order_no_date, data.firm_name, data.nomenclature, data.quantity,
                data.original_date || null, data.revised_date1 || null, data.revised_date2 || null, data.revised_date3 || null,
                data.build_up, data.maint, data.misc, data.project_no_pdc, data.actual_delivery_date || null,
                data.procurement_mode, data.delivery_done, data.remarks, data.financial_year, id
            ]
        );
        res.status(200).send();
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.put('/api/demand-orders/:id', async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    try {
        await pool.query(
            `UPDATE demand_orders SET serial_no = ?, demand_date = ?, group_demand_no_date = ?, mmg_control_no_date = ?, 
                nomenclature = ?, quantity = ?, expenditure_head = ?, rev_cap = ?, 
                procurement_mode = ?, est_cost = ?, imms_control_no = ?, remarks = ?, financial_year = ? 
             WHERE id = ?`,
            [
                data.serial_no, data.demand_date || null, data.group_demand_no_date, data.mmg_control_no_date,
                data.nomenclature, data.quantity, data.expenditure_head, data.rev_cap,
                data.procurement_mode, data.est_cost, data.imms_control_no, data.remarks, data.financial_year, id
            ]
        );
        res.status(200).send();
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.put('/api/bill-orders/:id', async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    try {
        await pool.query(
            `UPDATE bill_orders SET serial_no = ?, entry_date = ?, firm_name = ?, supply_order_no = ?, so_date = ?, 
                project_no = ?, build_up = ?, maintenance = ?, project_less_2cr = ?, project_more_2cr = ?, 
                procurement_mode = ?, rev_cap = ?, date_amount_passed = ?, ld_amount = ?, remarks = ?, financial_year = ? 
             WHERE id = ?`,
            [
                data.serial_no, data.entry_date || null, data.firm_name, data.supply_order_no, data.so_date || null,
                data.project_no, data.build_up, data.maintenance, data.project_less_2cr, data.project_more_2cr,
                data.procurement_mode, data.rev_cap, data.date_amount_passed, data.ld_amount, data.remarks, data.financial_year, id
            ]
        );
        res.status(200).send();
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.delete('/api/supply-orders/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM supply_orders WHERE id = ?', [id]);
        res.status(200).send();
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.delete('/api/demand-orders/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM demand_orders WHERE id = ?', [id]);
        res.status(200).send();
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.delete('/api/bill-orders/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM bill_orders WHERE id = ?', [id]);
        res.status(200).send();
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.post('/api/supply-orders/move/:id', async (req, res) => {
    const { id } = req.params;
    const { direction, financial_year } = req.body;
    try {
        const [rows] = await pool.query(
            'SELECT id, serial_no FROM supply_orders WHERE financial_year = ? ORDER BY serial_no',
            [financial_year]
        );
        const currentIndex = rows.findIndex(row => row.id == id);
        if (currentIndex === -1 || (direction === 'up' && currentIndex === 0) || (direction === 'down' && currentIndex === rows.length - 1)) {
            return res.status(400).send('Cannot move row');
        }
        const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        await pool.query(
            'UPDATE supply_orders SET serial_no = ? WHERE id = ?',
            [rows[swapIndex].serial_no, rows[currentIndex].id]
        );
        await pool.query(
            'UPDATE supply_orders SET serial_no = ? WHERE id = ?',
            [rows[currentIndex].serial_no, rows[swapIndex].id]
        );
        res.status(200).send();
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.post('/api/demand-orders/move/:id', async (req, res) => {
    const { id } = req.params;
    const { direction, financial_year } = req.body;
    try {
        const [rows] = await pool.query(
            'SELECT id, serial_no FROM demand_orders WHERE financial_year = ? ORDER BY serial_no',
            [financial_year]
        );
        const currentIndex = rows.findIndex(row => row.id == id);
        if (currentIndex === -1 || (direction === 'up' && currentIndex === 0) || (direction === 'down' && currentIndex === rows.length - 1)) {
            return res.status(400).send('Cannot move row');
        }
        const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        await pool.query(
            'UPDATE demand_orders SET serial_no = ? WHERE id = ?',
            [rows[swapIndex].serial_no, rows[currentIndex].id]
        );
        await pool.query(
            'UPDATE demand_orders SET serial_no = ? WHERE id = ?',
            [rows[currentIndex].serial_no, rows[swapIndex].id]
        );
        res.status(200).send();
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.post('/api/bill-orders/move/:id', async (req, res) => {
    const { id } = req.params;
    const { direction, financial_year } = req.body;
    try {
        const [rows] = await pool.query(
            'SELECT id, serial_no FROM bill_orders WHERE financial_year = ? ORDER BY serial_no',
            [financial_year]
        );
        const currentIndex = rows.findIndex(row => row.id == id);
        if (currentIndex === -1 || (direction === 'up' && currentIndex === 0) || (direction === 'down' && currentIndex === rows.length - 1)) {
            return res.status(400).send('Cannot move row');
        }
        const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        await pool.query(
            'UPDATE bill_orders SET serial_no = ? WHERE id = ?',
            [rows[swapIndex].serial_no, rows[currentIndex].id]
        );
        await pool.query(
            'UPDATE bill_orders SET serial_no = ? WHERE id = ?',
            [rows[currentIndex].serial_no, rows[swapIndex].id]
        );
        res.status(200).send();
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.post('/api/supply-orders/import', async (req, res) => {
    const { data, financial_year } = req.body;
    try {
        for (const row of data) {
            await pool.query(
                `INSERT INTO supply_orders (serial_no, supply_order_no_date, firm_name, nomenclature, quantity, 
                    original_date, revised_date1, revised_date2, revised_date3, 
                    build_up, maint, misc, project_no_pdc, actual_delivery_date,
                    procurement_mode, delivery_done, remarks, financial_year) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    row.serial_no, row.supply_order_no_date, row.firm_name, row.nomenclature, row.quantity,
                    row.original_date || null, row.revised_date1 || null, row.revised_date2 || null, row.revised_date3 || null,
                    row.build_up, row.maint, row.misc, row.project_no_pdc, row.actual_delivery_date || null,
                    row.procurement_mode, row.delivery_done, row.remarks, financial_year
                ]
            );
        }
        res.status(201).send();
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.post('/api/demand-orders/import', async (req, res) => {
    const { data, financial_year } = req.body;
    try {
        for (const row of data) {
            await pool.query(
                `INSERT INTO demand_orders (serial_no, demand_date, group_demand_no_date, mmg_control_no_date, nomenclature, quantity, 
                    expenditure_head, rev_cap, procurement_mode, est_cost, imms_control_no, remarks, financial_year) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    row.serial_no, row.demand_date || null, row.group_demand_no_date, row.mmg_control_no_date,
                    row.nomenclature, row.quantity, row.expenditure_head, row.rev_cap,
                    row.procurement_mode, row.est_cost, row.imms_control_no, row.remarks, financial_year
                ]
            );
        }
        res.status(201).send();
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.post('/api/bill-orders/import', async (req, res) => {
    const { data, financial_year } = req.body;
    try {
        for (const row of data) {
            await pool.query(
                `INSERT INTO bill_orders (serial_no, entry_date, firm_name, supply_order_no, so_date, 
                    project_no, build_up, maintenance, project_less_2cr, project_more_2cr, 
                    procurement_mode, rev_cap, date_amount_passed, ld_amount, remarks, financial_year) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    row.serial_no, row.entry_date || null, row.firm_name, row.supply_order_no, row.so_date || null,
                    row.project_no, row.build_up, row.maintenance, row.project_less_2cr, row.project_more_2cr,
                    row.procurement_mode, row.rev_cap, row.date_amount_passed, row.ld_amount, row.remarks, financial_year
                ]
            );
        }
        res.status(201).send();
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.get('/api/supply-backups', async (req, res) => {
    try {
        const files = await fs.readdir(backupDirs.supply);
        res.json(files);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.get('/api/demand-backups', async (req, res) => {
    try {
        const files = await fs.readdir(backupDirs.demand);
        res.json(files);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.get('/api/bill-backups', async (req, res) => {
    try {
        const files = await fs.readdir(backupDirs.bill);
        res.json(files);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
})
