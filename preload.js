const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getEmployees: () => ipcRenderer.invoke('get-employees'),
  addEmployee: (employee) => ipcRenderer.invoke('add-employee', employee),
  updateEmployee: (employee) => ipcRenderer.invoke('update-employee', employee),
  deleteEmployee: (employeeId) => ipcRenderer.invoke('delete-employee', employeeId),
  closeApp: () => ipcRenderer.send('close-app'),
  minimizeApp: () => ipcRenderer.send('minimize-app'),
  maximizeApp: () => ipcRenderer.send('maximize-app')
});