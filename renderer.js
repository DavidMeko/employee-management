document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('searchInput').addEventListener('input', searchEmployees);
    document.getElementById('addEmployeeBtn').addEventListener('click', () => showEmployeeForm());
    document.getElementById('closeBtn').addEventListener('click', () => window.api.closeApp());
    document.getElementById('minimizeBtn').addEventListener('click', () => window.api.minimizeApp());
    document.getElementById('maximizeBtn').addEventListener('click', () => window.api.maximizeApp());
});

async function searchEmployees() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    if (searchTerm.length < 2) {
        document.getElementById('employeeList').innerHTML = '';
        return;
    }

    try {
        const response = await window.api.getEmployees();
        if (response.success) {
            const filteredEmployees = response.data.filter(employee => 
                employee.employeeName.toLowerCase().includes(searchTerm) ||
                employee.userName.toLowerCase().includes(searchTerm)
            );
            displayEmployees(filteredEmployees);
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
    if (employees.length > 0) {
        employees.forEach(employee => {
            const card = document.createElement('div');
            card.className = 'employee-card';
            card.innerHTML = `
                <h3>${employee.employeeName}</h3>
                <p>${employee.userName}</p>
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
    document.getElementById('employeeList').classList.add('hidden');
    detailsDiv.classList.remove('hidden');
    detailsDiv.innerHTML = `
        <h2>${employee.employeeName}</h2>
        <p><strong>Username:</strong> ${employee.userName}</p>
        <p><strong>Department:</strong> ${employee.departmentName}</p>
        <p><strong>Hospital:</strong> ${employee.hospitalName}</p>
        <p><strong>Status:</strong> ${employee.status}</p>
        <h3>Roles</h3>
        <ul>${employee.roles.map(role => `<li>${role}</li>`).join('')}</ul>
        <h3>Transactions</h3>
        <ul>${employee.authorizations.map(auth => `<li>${auth.transactionName} (${auth.permissionType})</li>`).join('')}</ul>
        <div class="button-group">
            <button id="editEmployeeBtn" class="btn-primary">Edit</button>
            <button id="deleteEmployeeBtn" class="btn-danger">Delete</button>
            <button id="backBtn" class="btn-secondary">Back</button>
        </div>
    `;

    document.getElementById('editEmployeeBtn').addEventListener('click', () => showEmployeeForm(employee));
    document.getElementById('deleteEmployeeBtn').addEventListener('click', () => deleteEmployee(employee.employeeId));
    document.getElementById('backBtn').addEventListener('click', () => {
        detailsDiv.classList.add('hidden');
        document.getElementById('employeeList').classList.remove('hidden');
    });
}

async function showEmployeeForm(employee = null) {
    const formDiv = document.getElementById('employeeForm');
    document.getElementById('employeeList').classList.add('hidden');
    document.getElementById('employeeDetails').classList.add('hidden');
    formDiv.classList.remove('hidden');

    try {
        const [departmentsResponse, hospitalsResponse, rolesResponse, transactionsResponse, permissionsResponse] = await Promise.all([
            window.api.getDepartments(),
            window.api.getHospitals(),
            window.api.getRoles(),
            window.api.getTransactions(),
            window.api.getPermissions()
        ]);

        const departments = departmentsResponse.success ? departmentsResponse.data : [];
        const hospitals = hospitalsResponse.success ? hospitalsResponse.data : [];
        const roles = rolesResponse.success ? rolesResponse.data : [];
        const transactions = transactionsResponse.success ? transactionsResponse.data : [];
        const permissions = permissionsResponse.success ? permissionsResponse.data : [];

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
                    <label for="departmentId">Department:</label>
                    <select id="departmentId" required>
                        <option value="">Select Department</option>
                        ${departments.map(dept => `<option value="${dept.departmentId}" ${employee && employee.departmentId === dept.departmentId ? 'selected' : ''}>${dept.departmentName}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="hospitalId">Hospital:</label>
                    <select id="hospitalId" required>
                        <option value="">Select Hospital</option>
                        ${hospitals.map(hosp => `<option value="${hosp.hospitalId}" ${employee && employee.hospitalId === hosp.hospitalId ? 'selected' : ''}>${hosp.hospitalName}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="status">Status:</label>
                    <input type="text" id="status" required value="${employee ? employee.status : ''}">
                </div>
                <div class="form-group">
                    <label>Roles:</label>
                    <div id="rolesContainer">
                        ${employee && employee.roles ? employee.roles.map(role => createRoleField(roles, role)).join('') : ''}
                    </div>
                    <button type="button" id="addRoleBtn" class="add-btn">Add Role</button>
                </div>
                <div class="form-group">
                    <label>Transactions:</label>
                    <div id="transactionsContainer">
                        ${employee && employee.authorizations ? employee.authorizations.map(auth => createTransactionField(transactions, permissions, auth)).join('') : ''}
                    </div>
                    <button type="button" id="addTransactionBtn" class="add-btn">Add Transaction</button>
                </div>
                <div class="button-group">
                    <button type="submit" class="btn-primary">Save</button>
                    <button type="button" id="cancelBtn" class="btn-secondary">Cancel</button>
                </div>
            </form>
        `;
        
        document.getElementById('employeeFormContent').addEventListener('submit', handleFormSubmit);
        document.getElementById('cancelBtn').addEventListener('click', hideEmployeeForm);
        document.getElementById('addRoleBtn').addEventListener('click', () => addRoleField(roles));
        document.getElementById('addTransactionBtn').addEventListener('click', () => addTransactionField(transactions, permissions));
    } catch (error) {
        console.error('Error setting up employee form:', error);
        alert('Failed to set up employee form. Please try again.');
    }
}

function createRoleField(roles, selectedRole = null) {
    if (!Array.isArray(roles)) {
        console.error('Roles data is not an array:', roles);
        return '';
    }
    return `
        <div class="role-item">
            <select class="role-select">
                <option value="">Select Role</option>
                ${roles.map(role => `<option value="${role.roleId}" ${selectedRole === role.roleName ? 'selected' : ''}>${role.roleName}</option>`).join('')}
            </select>
            <button type="button" class="remove-btn">Delete</button>
        </div>
    `;
}

function createTransactionField(transactions, permissions, selectedAuth = null) {
    if (!Array.isArray(transactions) || !Array.isArray(permissions)) {
        console.error('Transactions or permissions data is not an array:', { transactions, permissions });
        return '';
    }
    return `
        <div class="transaction-item">
            <select class="transaction-select">
                <option value="">Select Transaction</option>
                ${transactions.map(trans => `<option value="${trans.transactionId}" ${selectedAuth && selectedAuth.transactionName === trans.transactionName ? 'selected' : ''}>${trans.transactionName}</option>`).join('')}
            </select>
            <select class="permission-select">
                <option value="">Select Permission</option>
                ${permissions.map(perm => `<option value="${perm.permissionId}" ${selectedAuth && selectedAuth.permissionType === perm.permissionType ? 'selected' : ''}>${perm.permissionType}</option>`).join('')}
            </select>
            <button type="button" class="remove-btn">Delete</button>
        </div>
    `;
}

function addRoleField(roles) {
    if (!Array.isArray(roles)) {
        console.error('Roles data is not an array:', roles);
        return;
    }
    const rolesContainer = document.getElementById('rolesContainer');
    const newRoleField = document.createElement('div');
    newRoleField.innerHTML = createRoleField(roles);
    rolesContainer.appendChild(newRoleField.firstElementChild);
    rolesContainer.lastElementChild.querySelector('.remove-btn').addEventListener('click', (e) => e.target.closest('.role-item').remove());
}

function addTransactionField(transactions, permissions) {
    if (!Array.isArray(transactions) || !Array.isArray(permissions)) {
        console.error('Transactions or permissions data is not an array:', { transactions, permissions });
        return;
    }
    const transactionsContainer = document.getElementById('transactionsContainer');
    const newTransactionField = document.createElement('div');
    newTransactionField.innerHTML = createTransactionField(transactions, permissions);
    transactionsContainer.appendChild(newTransactionField.firstElementChild);
    transactionsContainer.lastElementChild.querySelector('.remove-btn').addEventListener('click', (e) => e.target.closest('.transaction-item').remove());
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
            employee.id = result.employeeId;
        }

        if (result.success) {
            const roles = Array.from(document.querySelectorAll('.role-select'))
                .map(select => select.value)
                .filter(value => value !== "");
            await window.api.updateEmployeeRoles({ employeeId: employee.id, roles });

            const authorizations = Array.from(document.querySelectorAll('.transaction-item'))
                .map(item => ({
                    transactionId: item.querySelector('.transaction-select').value,
                    permissionId: item.querySelector('.permission-select').value
                }))
                .filter(auth => auth.transactionId !== "" && auth.permissionId !== "");
            await window.api.updateEmployeeAuthorizations({ employeeId: employee.id, authorizations });

            hideEmployeeForm();
            searchEmployees();
        } else {
            alert(`Failed to save employee. Error: ${result.error}`);
        }
    } catch (error) {
        console.error('Error saving employee:', error);
        alert('Failed to save employee. Please try again.');
    }
}

function hideEmployeeForm() {
    document.getElementById('employeeForm').classList.add('hidden');
    document.getElementById('employeeList').classList.remove('hidden');
}

async function deleteEmployee(employeeId) {
    if (confirm('Are you sure you want to delete this employee?')) {
        try {
            const result = await window.api.deleteEmployee(employeeId);
            if (result.success) {
                hideEmployeeForm();
                searchEmployees();
            } else {
                alert(`Failed to delete employee. Error: ${result.error}`);
            }
        } catch (error) {
            console.error('Error deleting employee:', error);
            alert('Failed to delete employee. Please try again.');
        }
    }
}

function displayError(message) {
    const employeeList = document.getElementById('employeeList');
    employeeList.innerHTML = `<p class="error-message">${message}</p>`;
}