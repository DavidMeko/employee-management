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

ipcMain.handle('get-employees', async () => {
  try {
    const query = `
      SELECT e.*, d.departmentName, h.hospitalName
      FROM ((Employees e
      LEFT JOIN Departments d ON e.departmentId = d.departmentId)
      LEFT JOIN Hospitals h ON e.hospitalId = h.hospitalId)
    `;
    const employees = await connection.query(query);

    for (let employee of employees) {
      // Get roles
      const rolesQuery = `
        SELECT r.roleName
        FROM (EmployeeRoles er
        INNER JOIN Roles r ON er.roleId = r.roleId)
        WHERE er.employeeId = ${employee.employeeId}
      `;
      const roles = await connection.query(rolesQuery);
      employee.roles = roles.map(r => r.roleName);

      // Get authorizations
      const authQuery = `
        SELECT t.transactionName, p.permissionType
        FROM ((EmployeeAuthorizations ea
        INNER JOIN Transactions t ON ea.transactionId = t.transactionId)
        INNER JOIN Permissions p ON ea.permissionId = p.permissionId)
        WHERE ea.employeeId = ${employee.employeeId}
      `;
      const authorizations = await connection.query(authQuery);
      employee.authorizations = authorizations;
    }

    return { success: true, data: employees };
  } catch (error) {
    console.error('Error fetching employees:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('getDepartments', async () => {
  try {
    const query = 'SELECT * FROM Departments';
    const result = await connection.query(query);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error fetching departments:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('getHospitals', async () => {
  try {
    const query = 'SELECT * FROM Hospitals';
    const result = await connection.query(query);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error fetching hospitals:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('getRoles', async () => {
  try {
    const query = 'SELECT * FROM Roles';
    const result = await connection.query(query);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error fetching roles:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('getTransactions', async () => {
  try {
    const query = 'SELECT * FROM Transactions';
    const result = await connection.query(query);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('getPermissions', async () => {
  try {
    const query = 'SELECT * FROM Permissions';
    const result = await connection.query(query);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('add-employee', async (event, employee) => {
  try {
    const query = `INSERT INTO Employees (employeeName, userName, departmentId, hospitalId, status) 
                   VALUES ('${employee.name}', '${employee.username}', ${employee.departmentId}, ${employee.hospitalId}, '${employee.status}')`;
    await connection.query(query);
    
    // Get the ID of the newly inserted employee
    const getIdQuery = 'SELECT @@IDENTITY AS id';
    const idResult = await connection.query(getIdQuery);
    const newEmployeeId = idResult[0].id;

    return { success: true, employeeId: newEmployeeId };
  } catch (error) {
    console.error('Error adding employee:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-employee', async (event, employee) => {
  try {
    const query = `UPDATE Employees 
                   SET employeeName = '${employee.name}', 
                       userName = '${employee.username}', 
                       departmentId = ${employee.departmentId}, 
                       hospitalId = ${employee.hospitalId}, 
                       status = '${employee.status}'
                   WHERE employeeId = ${employee.id}`;
    await connection.query(query);
    return { success: true };
  } catch (error) {
    console.error('Error updating employee:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-employee', async (event, employeeId) => {
  try {
    const query = `DELETE FROM Employees WHERE employeeId = ${employeeId}`;
    await connection.query(query);
    return { success: true };
  } catch (error) {
    console.error('Error deleting employee:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('updateEmployeeRoles', async (event, { employeeId, roles }) => {
  try {
    // First, delete existing roles for the employee
    await connection.query(`DELETE FROM EmployeeRoles WHERE employeeId = ${employeeId}`);
    
    // Then, insert new roles
    for (let roleId of roles) {
      await connection.query(`INSERT INTO EmployeeRoles (employeeId, roleId) VALUES (${employeeId}, ${roleId})`);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating employee roles:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('updateEmployeeAuthorizations', async (event, { employeeId, authorizations }) => {
  try {
    // First, delete existing authorizations for the employee
    await connection.query(`DELETE FROM EmployeeAuthorizations WHERE employeeId = ${employeeId}`);
    
    // Then, insert new authorizations
    for (let auth of authorizations) {
      await connection.query(`INSERT INTO EmployeeAuthorizations (employeeId, transactionId, permissionId) 
                              VALUES (${employeeId}, ${auth.transactionId}, ${auth.permissionId})`);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating employee authorizations:', error);
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