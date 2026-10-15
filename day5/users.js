const loadBtn = document.getElementById('load-users');
const filterInput = document.getElementById('filter-input');
const statusText = document.getElementById('status');
const usersList = document.getElementById('users-list');

let allUsers = [];

async function loadUsers() { 
    loadBtn.disabled = true;
    statusText.textContent = 'Loading users...';

    try {
        const response = await fetch('https://jsonplaceholder.typicode.com/users');
        // const response = await fetch('https://jsonplaceholder.typicode.com/users-broken');
        
        // fetch does NOT fail on 404 or 500, so we check response.ok
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        allUsers = data;

        renderUsers(allUsers);

        console.log(allUsers);   // check your console!
       
        statusText.textContent = `Loaded ${allUsers.length} users.`;

    } catch (error) {   
        statusText.textContent = `Error: ${error.message}`;

    } finally {
        loadBtn.disabled = false;
    }
}

loadBtn.addEventListener('click', loadUsers);

function renderUsers(list) {
    usersList.innerHTML = '';

    if (list.length === 0) {
        statusText.textContent = 'No users match your filter.';
        return;
    }

    list.forEach(user => {
        const li = document.createElement('li');

        const nameEl = document.createElement('strong');
        nameEl.textContent = user.name;

        const emailEl = document.createElement('p');
        emailEl.textContent = user.email;

        const cityEl = document.createElement('p');
        cityEl.textContent = user.address.city;

        // NOTE: The assignment asks for company name instead of phone:
        const companyEl = document.createElement('p');
        companyEl.textContent = user.company.name;

        li.appendChild(nameEl);
        li.appendChild(emailEl);
        li.appendChild(cityEl);
        li.appendChild(companyEl);

        usersList.appendChild(li);
    });
}

filterInput.addEventListener('input', () => {
    // 1. Get the typed text in lowercase
    const searchTerm = filterInput.value.toLowerCase();

    // 2. Filter allUsers
    const filteredUsers = allUsers.filter(user => 
        user.name.toLowerCase().includes(searchTerm)
);
    // 3. Call renderUsers(filteredUsers)
    renderUsers(filteredUsers);

    // 4. Optionally update statusText if there are matches
    if (filteredUsers.length > 0) {
        statusText.textContent = `Showing ${filteredUsers.length} of ${allUsers.length} users.`;
    } else {
        statusText.textContent = 'No users match your filter.';
    }
});
