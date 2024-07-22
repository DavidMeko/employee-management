const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const odbc = require('odbc');

let mainWindow;
let connection;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    frame: false
  });

  mainWindow.loadFile('index.html');
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(async () => {
  createWindow();
  await connectToDatabase();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

const dbPath = path.join(__dirname, 'data', 'database.accdb');
const connectionString = `Driver={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=${dbPath};`;

async function connectToDatabase() {
  try {
    connection = await odbc.connect(connectionString);
    console.log('Connected to the database successfully');
  } catch (error) {
    console.error('Error connecting to the database:', error);
    setTimeout(connectToDatabase, 5000);
  }
}

async function ensureConnection() {
  if (!connection) {
    console.log('No active connection, attempting to connect...');
    await connectToDatabase();
  }
  return connection;
}

ipcMain.handle('get-employees', async () => {
  try {
    const conn = await ensureConnection();
    const query = `
      SELECT e.*, d.departmentName, h.hospitalName,
             (SELECT GROUP_CONCAT(p.permissionName, ', ') 
              FROM Permissions p 
              WHERE p.employeeId = e.employeeId) AS permissions,
             (SELECT GROUP_CONCAT(r.roleName, ', ')
              FROM EmployeeRoles er
              JOIN Roles r ON er.roleId = r.roleId
              WHERE er.employeeId = e.employeeId) AS roles
      FROM Employees e
      LEFT JOIN Departments d ON e.departmentId = d.departmentId
      LEFT JOIN Hospitals h ON e.hospitalId = h.hospitalId
    `;
    console.log('Executing query:', query);
    const result = await conn.query(query);
    console.log('Query result:', result);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error fetching employees:', error);
    return { success: false, error: error.message, stack: error.stack };
  }
});

ipcMain.handle('add-employee', async (event, employee) => {
  try {
    const conn = await ensureConnection();
    const query = `INSERT INTO Employees (employeeName, userName, departmentId, hospitalId, status) 
                   VALUES (?, ?, ?, ?, ?)`;
    const params = [employee.name, employee.username, employee.departmentId, employee.hospitalId, employee.status];
    console.log('Executing query:', query, 'with params:', params);
    await conn.query(query, params);
    return { success: true };
  } catch (error) {
    console.error('Error adding employee:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-employee', async (event, employee) => {
  try {
    const conn = await ensureConnection();
    const query = `UPDATE Employees 
                   SET employeeName = ?, userName = ?, departmentId = ?, hospitalId = ?, status = ?
                   WHERE employeeId = ?`;
    const params = [employee.name, employee.username, employee.departmentId, employee.hospitalId, employee.status, employee.id];
    console.log('Executing query:', query, 'with params:', params);
    await conn.query(query, params);
    return { success: true };
  } catch (error) {
    console.error('Error updating employee:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-employee', async (event, employeeId) => {
  try {
    const conn = await ensureConnection();
    const query = `DELETE FROM Employees WHERE employeeId = ?`;
    console.log('Executing query:', query, 'with params:', employeeId);
    await conn.query(query, [employeeId]);
    return { success: true };
  } catch (error) {
    console.error('Error deleting employee:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.on('close-app', () => {
  app.quit();
});

ipcMain.on('minimize-app', () => {
  mainWindow.minimize();
});

ipcMain.on('maximize-app', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});