document.addEventListener('DOMContentLoaded', () => {
    loadEmployees();
    
    document.getElementById('searchInput').addEventListener('input', searchEmployees);
    document.getElementById('addEmployeeBtn').addEventListener('click', () => showEmployeeForm());
    
    document.getElementById('closeBtn').addEventListener('click', () => window.api.closeApp());
    document.getElementById('minimizeBtn').addEventListener('click', () => window.api.minimizeApp());
    document.getElementById('maximizeBtn').addEventListener('click', () => window.api.maximizeApp());
});

async function loadEmployees() {
    try {
        const response = await window.api.getEmployees();
        if (response.success) {
            displayEmployees(response.data);
        } else {
            console.error('Error loading employees:', response.error);
            displayError(`Failed to load employees. Error: ${response.error}`);
        }
    } catch (error) {
        console.error('Error loading employees:', error);
        displayError(`An unexpected error occurred. Error: ${error.message}`);
    }
}

function displayEmployees(employees) {
    const employeeList = document.getElementById('employeeList');
    employeeList.innerHTML = '';
    if (Array.isArray(employees) && employees.length > 0) {
        employees.forEach(employee => {
            const card = document.createElement('div');
            card.className = 'employee-card';
            card.innerHTML = `
                <h3>${employee.employeeName || 'N/A'}</h3>
                <p>Username: ${employee.userName || 'N/A'}</p>
                <p>Department: ${employee.departmentName || 'N/A'}</p>
                <p>Hospital: ${employee.hospitalName || 'N/A'}</p>
            `;
            card.addEventListener('click', () => showEmployeeDetails(employee));
            employeeList.appendChild(card);
        });
    } else {
        employeeList.innerHTML = '<p class="no-employees">No employees found.</p>';
    }
}

function showEmployeeDetails(employee) {
    const detailsDiv = document.getElementById('employeeDetails');
    detailsDiv.innerHTML = `
        <h2>Employee Details</h2>
        <p><strong>Name:</strong> ${employee.employeeName || 'N/A'}</p>
        <p><strong>Username:</strong> ${employee.userName || 'N/A'}</p>
        <p><strong>Department:</strong> ${employee.departmentName || 'N/A'}</p>
        <p><strong>Hospital:</strong> ${employee.hospitalName || 'N/A'}</p>
        <p><strong>Status:</strong> ${employee.status || 'N/A'}</p>
        <p><strong>Roles:</strong> ${employee.roles || 'No roles assigned'}</p>
        <p><strong>Permissions:</strong> ${employee.permissions || 'No permissions assigned'}</p>
        <div class="button-group">
            <button id="editEmployeeBtn">Edit</button>
            <button id="deleteEmployeeBtn">Delete</button>
        </div>
    `;
    detailsDiv.classList.remove('hidden');

    document.getElementById('editEmployeeBtn').addEventListener('click', () => showEmployeeForm(employee));
    document.getElementById('deleteEmployeeBtn').addEventListener('click', () => deleteEmployee(employee.employeeId));
}

function showEmployeeForm(employee = null) {
    const formDiv = document.getElementById('employeeForm');
    formDiv.innerHTML = `
        <h2>${employee ? 'Edit Employee' : 'Add Employee'}</h2>
        <form id="employeeFormContent">
            <input type="hidden" id="employeeId" value="${employee ? employee.employeeId : ''}">
            <div class="form-group">
                <label for="name">Name:</label>
                <input type="text" id="name" required value="${employee ? employee.employeeName : ''}">
            </div>
            <div class="form-group">
                <label for="username">Username:</label>
                <input type="text" id="username" required value="${employee ? employee.userName : ''}">
            </div>
            <div class="form-group">
                <label for="departmentId">Department ID:</label>
                <input type="number" id="departmentId" required value="${employee ? employee.departmentId : ''}">
            </div>
            <div class="form-group">
                <label for="hospitalId">Hospital ID:</label>
                <input type="number" id="hospitalId" required value="${employee ? employee.hospitalId : ''}">
            </div>
            <div class="form-group">
                <label for="status">Status:</label>
                <input type="text" id="status" required value="${employee ? employee.status : ''}">
            </div>
            <div class="button-group">
                <button type="submit">Save</button>
                <button type="button" id="cancelBtn">Cancel</button>
            </div>
        </form>
    `;
    formDiv.classList.remove('hidden');
    
    document.getElementById('employeeFormContent').addEventListener('submit', handleFormSubmit);
    document.getElementById('cancelBtn').addEventListener('click', hideEmployeeForm);
}

function hideEmployeeForm() {
    document.getElementById('employeeForm').classList.add('hidden');
}

async function handleFormSubmit(event) {
    event.preventDefault();
    const employeeId = document.getElementById('employeeId').value;
    const employee = {
        id: employeeId,
        name: document.getElementById('name').value,
        username: document.getElementById('username').value,
        departmentId: document.getElementById('departmentId').value,
        hospitalId: document.getElementById('hospitalId').value,
        status: document.getElementById('status').value
    };

    try {
        let result;
        if (employeeId) {
            result = await window.api.updateEmployee(employee);
        } else {
            result = await window.api.addEmployee(employee);
        }
        if (result.success) {
            hideEmployeeForm();
            loadEmployees();
        } else {
            alert(`Failed to save employee. Error: ${result.error}`);
        }
    } catch (error) {
        console.error('Error saving employee:', error);
        alert('Failed to save employee. Please try again.');
    }
}

async function deleteEmployee(employeeId) {
    if (confirm('Are you sure you want to delete this employee?')) {
        try {
            const result = await window.api.deleteEmployee(employeeId);
            if (result.success) {
                loadEmployees();
            } else {
                alert(`Failed to delete employee. Error: ${result.error}`);
            }
        } catch (error) {
            console.error('Error deleting employee:', error);
            alert('Failed to delete employee. Please try again.');
        }
    }
}

function searchEmployees() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const employeeCards = document.querySelectorAll('.employee-card');
    employeeCards.forEach(card => {
        const content = card.textContent.toLowerCase();
        if (content.includes(searchTerm)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

function displayError(message) {
    const employeeList = document.getElementById('employeeList');
    employeeList.innerHTML = `<p class="error-message">${message}</p>`;
}