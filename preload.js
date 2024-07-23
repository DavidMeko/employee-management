const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    getEmployees: () => ipcRenderer.invoke('get-employees'),
    addEmployee: (employee) => ipcRenderer.invoke('add-employee', employee),
    updateEmployee: (employee) => ipcRenderer.invoke('update-employee', employee),
    deleteEmployee: (employeeId) => ipcRenderer.invoke('delete-employee', employeeId),
    getDepartments: () => ipcRenderer.invoke('getDepartments'),
    getHospitals: () => ipcRenderer.invoke('getHospitals'),
    getRoles: () => ipcRenderer.invoke('getRoles'),
    getTransactions: () => ipcRenderer.invoke('getTransactions'),
    getPermissions: () => ipcRenderer.invoke('getPermissions'),
    updateEmployeeRoles: (data) => ipcRenderer.invoke('updateEmployeeRoles', data),
    updateEmployeeAuthorizations: (data) => ipcRenderer.invoke('updateEmployeeAuthorizations', data),
    closeApp: () => ipcRenderer.send('close-app'),
    minimizeApp: () => ipcRenderer.send('minimize-app'),
    maximizeApp: () => ipcRenderer.send('maximize-app')
});