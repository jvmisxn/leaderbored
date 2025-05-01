// --- golf_courses.js ---

// --- Add Course Modal Functions ---

function openAddCourseModal() {
    // Ensure necessary elements/functions are accessible: addCourseModal, db, openModal, closeModal, handleAddCourseSubmit
    const modalElement = document.getElementById('add-course-modal'); //
    if (!modalElement) { console.error("Add Course modal element (#add-course-modal) not found."); alert("Error: Cannot open Add Course form."); return; } //
    if (!db) { console.error("Add Course modal: DB not ready."); alert("Error: Cannot open Add Course form. Database connection failed."); return; } //

    // Define and Inject HTML (with dark mode classes)
    const modalContentHTML = `
        <div class="modal-content">
            <button id="close-add-course-modal-btn" class="modal-close-button">&times;</button>
            <h2 class="text-2xl font-semibold mb-5 text-indigo-700 dark:text-indigo-400">Add New Golf Course</h2>
            <form id="add-course-form">
                <div class="mb-4">
                    <label for="course-name" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Course Name:</label>
                    <input type="text" id="course-name" name="course-name" class="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 dark:border-gray-500 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                </div>
                <div class="mb-4">
                    <label for="course-location" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Location (Optional):</label>
                    <input type="text" id="course-location" name="course-location" class="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 dark:border-gray-500 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., City, State">
                </div>
                <div class="mb-5">
                    <label for="course-par" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Total Par (18 Holes):</label>
                    <input type="number" id="course-par" name="course-par" min="50" max="80" class="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 dark:border-gray-500 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500" required placeholder="e.g., 72">
                     <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Enter the standard 18-hole par for the course.</p>
                </div>
                <div class="mt-6 flex justify-end space-x-3">
                    <button type="button" id="cancel-add-course-modal-btn" class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-5 rounded-lg">Cancel</button>
                    <button type="submit" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-5 rounded-lg">Add Course</button>
                </div>
            </form>
        </div>`; //
    modalElement.innerHTML = modalContentHTML; //

    // Get references and attach listeners
    const closeButton = modalElement.querySelector('#close-add-course-modal-btn'); //
    const cancelButton = modalElement.querySelector('#cancel-add-course-modal-btn'); //
    const modalForm = modalElement.querySelector('#add-course-form'); //

    if (closeButton) closeButton.addEventListener('click', closeAddCourseModal); //
    if (cancelButton) cancelButton.addEventListener('click', closeAddCourseModal); //
    if (modalForm) modalForm.addEventListener('submit', handleAddCourseSubmit); //

    openModal(modalElement); // Show the modal
} // End openAddCourseModal

function closeAddCourseModal() {
    // Ensure addCourseModal and closeModal are accessible
    const modalElement = document.getElementById('add-course-modal'); //
    if (modalElement) closeModal(modalElement); // Use generic close
} // End closeAddCourseModal

// Handles submission of the Add Course modal form
async function handleAddCourseSubmit(event) {
    event.preventDefault(); //
    const form = event.target; //
    // Ensure db, firebase, closeAddCourseModal, populateGolfCourses, populateLiveGolfCourseSelect are accessible
    if (!db || !firebase || !firebase.firestore) { alert("Database connection or Firestore components missing."); return; } //

    // Basic Form Validation
    let isValid = true; //
    form.querySelectorAll('input[required]').forEach(field => {
        field.classList.remove('border-red-500'); //
        if (!field.value.trim()) { isValid = false; field.classList.add('border-red-500'); } //
    });
    const courseParInput = form.querySelector('#course-par'); //
    const coursePar = parseInt(courseParInput?.value, 10); //
    courseParInput?.classList.remove('border-red-500'); // Reset border
    if (courseParInput && (isNaN(coursePar) || coursePar < 50 || coursePar > 80)) { // Basic par validation
        courseParInput.classList.add('border-red-500'); //
        isValid = false; //
        alert("Please enter a valid Total Par (usually between 50 and 80)."); //
    }
    if (!isValid) { alert("Please fill out all required fields correctly."); return; } //
    // --- End Validation ---

    const formData = new FormData(form); //
    const courseName = formData.get('course-name')?.trim(); //
    const courseLocation = formData.get('course-location')?.trim() || null; // Store null if empty

    if (!courseName) { console.error("[ADD COURSE] Course name is empty after trim."); return; } //
    console.log(`[ADD COURSE] Attempting to add course: ${courseName}`); //

    try {
        const courseData = {
            name: courseName, //
            location: courseLocation, //
            total_par: coursePar, // Already parsed and validated
            date_created: firebase.firestore.FieldValue.serverTimestamp() //
            // Add other fields like slope, rating here if added to the form
        };

        // Add the new course document to the 'golf_courses' collection
        const docRef = await db.collection('golf_courses').add(courseData); //
        console.log(`[FIRESTORE] Course "${courseName}" added successfully with ID: ${docRef.id}`); //
        alert(`Course "${courseName}" added successfully!`); //
        closeAddCourseModal(); // Close the modal

        // Refresh relevant UI sections immediately
        // 1. Refresh the courses list in the Sports section (golf details view)
        const golfDetailsView = document.getElementById('golf-details-view'); //
        if (golfDetailsView && !golfDetailsView.classList.contains('hidden') && typeof populateGolfCourses === 'function') { //
            console.log("[ADD COURSE] Refreshing golf courses list in Sports section..."); //
            await populateGolfCourses(); //
        }
        // 2. Refresh the course dropdown in the Live Game section
        //    (Need to check if function is accessible - it might be in live_game.js)
        if (typeof populateLiveGolfCourseSelect === 'function') {
             console.log("[ADD COURSE] Refreshing live golf course select dropdown..."); //
             await populateLiveGolfCourseSelect(); //
             // Clear cache used by live golf select if necessary (depends on implementation)
             // liveGolfCourseDataCache = {}; // Example cache clearing
        }
        // 3. Potentially refresh course dropdown in Submit Past Game form if it's complex/cached
        //    (Requires checking if that form is active and how its dropdown is populated)


    } catch (error) {
        console.error("Error adding course:", error); //
        alert(`Failed to add course: ${error.message}`); //
    }
} // End handleAddCourseSubmit


// --- Populate Golf Courses List (Sports Section) ---

async function populateGolfCourses() {
    const listElement = document.getElementById('golf-courses-list');
    if (!listElement) {
        console.warn("[SPORTS/GOLF] Golf courses list element (#golf-courses-list) not found in current DOM.");
        return;
    }
    if (!db) {
        console.error("[SPORTS/GOLF] Firestore DB not initialized.");
        listElement.innerHTML = '<p class="error-text p-2">Error: Database connection failed.</p>';
        return;
    }

    console.log("[SPORTS/GOLF] Populating golf courses list...");
    listElement.innerHTML = '<p class="text-gray-500 dark:text-gray-400 p-2">Loading courses...</p>';

    try {
        const snapshot = await db.collection('golf_courses').orderBy('name').get();

        if (snapshot.empty) {
            listElement.innerHTML = '<p class="text-gray-500 dark:text-gray-400 p-2 italic">No golf courses found. Use the "Add New Course" button.</p>';
            return;
        }

        // Table for courses
        let html = `
            <table class="min-w-full text-sm border-collapse border border-gray-300 dark:border-gray-600 mb-4">
                <thead>
                    <tr class="bg-gray-100 dark:bg-gray-700">
                        <th class="p-2 border">Course Name</th>
                        <th class="p-2 border">Location</th>
                        <th class="p-2 border">Par</th>
                        <th class="p-2 border admin-only">Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;

        snapshot.forEach(doc => {
            const course = { id: doc.id, ...doc.data() };
            html += `
                <tr>
                    <td class="p-2 border">${course.name || 'Unnamed Course'}</td>
                    <td class="p-2 border">${course.location || '-'}</td>
                    <td class="p-2 border">${course.total_par || '-'}</td>
                    <td class="p-2 border admin-only">
                        <button class="edit-course-btn button button-xs button-secondary" data-course-id="${course.id}">Edit</button>
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        listElement.innerHTML = html;

        // Attach edit button listeners (admin only)
        listElement.querySelectorAll('.edit-course-btn').forEach(btn => {
            // Ensure listener is only added once or remove previous if re-populating
            btn.removeEventListener('click', handleEditCourseButtonClick); // Prevent duplicates
            btn.addEventListener('click', handleEditCourseButtonClick);
        });

    } catch (error) {
        console.error("[SPORTS/GOLF] Error fetching golf courses:", error);
        listElement.innerHTML = `<p class="text-red-500 p-2">Error loading courses: ${error.message}</p>`;
    }
}

// Helper function to handle the click event, extracting the ID
function handleEditCourseButtonClick(event) {
    const courseId = event.target.getAttribute('data-course-id');
    if (courseId) {
        openEditCourseModal(courseId);
    } else {
        console.error("Edit button clicked but no course ID found.");
    }
}

// --- Edit Course Modal Functions ---

/**
 * Fetches course data and opens the modal for editing.
 * @param {string} courseId - The ID of the course to edit.
 */
async function openEditCourseModal(courseId) {
    const modalElement = document.getElementById('edit-course-modal');
    if (!modalElement) { console.error("Edit Course modal element not found."); return; }
    if (!db) { console.error("Edit Course modal: DB not ready."); alert("Database connection failed."); return; }

    modalElement.innerHTML = '<div class="modal-content"><p class="loading-text p-5">Loading course data for editing...</p></div>';
    openModal(modalElement); // Open modal with loading state

    try {
        const docRef = db.collection('golf_courses').doc(courseId);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            throw new Error("Golf course not found.");
        }

        const course = { id: docSnap.id, ...docSnap.data() };

        // Build HTML for the modal form
        const modalContentHTML = `
            <div class="modal-content">
                <button id="close-edit-course-modal-btn" class="modal-close-button">&times;</button>
                <h2 class="text-2xl font-semibold mb-5 text-indigo-700 dark:text-indigo-400">Edit Golf Course</h2>
                <form id="edit-course-form" data-course-id="${course.id}">
                    <div class="mb-4">
                        <label for="edit-course-name" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Course Name:</label>
                        <input type="text" id="edit-course-name" name="course-name" value="${course.name || ''}" class="input-field" required>
                    </div>
                    <div class="mb-4">
                        <label for="edit-course-location" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Location (Optional):</label>
                        <input type="text" id="edit-course-location" name="course-location" value="${course.location || ''}" class="input-field" placeholder="e.g., City, State">
                    </div>
                    <div class="mb-5">
                        <label for="edit-course-par" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Total Par (18 Holes):</label>
                        <input type="number" id="edit-course-par" name="course-par" value="${course.total_par || ''}" min="50" max="80" class="input-field" required placeholder="e.g., 72">
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Enter the standard 18-hole par for the course.</p>
                    </div>
                    <!-- Add fields for slope, rating if needed -->
                    <div class="mt-6 flex justify-end space-x-3">
                        <button type="button" id="cancel-edit-course-modal-btn" class="button button-secondary">Cancel</button>
                        <button type="submit" class="button button-primary">Save Changes</button>
                    </div>
                    <p id="edit-course-error" class="text-red-500 text-sm mt-2 h-4"></p>
                </form>
            </div>`;

        modalElement.innerHTML = modalContentHTML;

        // Attach listeners within the modal
        modalElement.querySelector('#close-edit-course-modal-btn')?.addEventListener('click', closeEditCourseModal);
        modalElement.querySelector('#cancel-edit-course-modal-btn')?.addEventListener('click', closeEditCourseModal);
        modalElement.querySelector('#edit-course-form')?.addEventListener('submit', handleEditCourseSubmit);

    } catch (error) {
        console.error(`Error loading course ${courseId} for editing:`, error);
        modalElement.innerHTML = `<div class="modal-content"><button class="modal-close-button" onclick="closeEditCourseModal()">&times;</button><p class="error-text p-5">Error loading course data: ${error.message}</p></div>`;
    }
}

/**
 * Closes the Edit Course modal.
 */
function closeEditCourseModal() {
    const modalElement = document.getElementById('edit-course-modal');
    if (modalElement) closeModal(modalElement);
}

/**
 * Handles the submission of the Edit Course form.
 * @param {Event} event - The form submission event.
 */
async function handleEditCourseSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const courseId = form.getAttribute('data-course-id');
    const submitButton = form.querySelector('button[type="submit"]');
    const errorMsgElement = form.querySelector('#edit-course-error');

    if (!courseId) { console.error("Edit submit: Missing course ID."); return; }
    if (!db || !firebase || !firebase.firestore) { console.error("Edit submit: DB not ready."); alert("Database connection error."); return; }

    submitButton.disabled = true;
    if (errorMsgElement) errorMsgElement.textContent = '';

    // Basic Form Validation
    let isValid = true;
    form.querySelectorAll('input[required]').forEach(field => {
        field.classList.remove('border-red-500');
        if (!field.value.trim()) { isValid = false; field.classList.add('border-red-500'); }
    });
    const courseParInput = form.querySelector('#edit-course-par');
    const coursePar = parseInt(courseParInput?.value, 10);
    courseParInput?.classList.remove('border-red-500');
    if (courseParInput && (isNaN(coursePar) || coursePar < 50 || coursePar > 80)) {
        courseParInput.classList.add('border-red-500');
        isValid = false;
        if (errorMsgElement) errorMsgElement.textContent = "Please enter a valid Total Par (usually 50-80).";
    }
    if (!isValid) {
        if (errorMsgElement && !errorMsgElement.textContent) errorMsgElement.textContent = "Please fill out required fields correctly.";
        submitButton.disabled = false;
        return;
    }
    // --- End Validation ---

    const formData = new FormData(form);
    const updatedData = {
        name: formData.get('course-name')?.trim(),
        location: formData.get('course-location')?.trim() || null, // Store null if empty
        total_par: coursePar,
        // Add slope, rating if implemented
        last_updated: firebase.firestore.FieldValue.serverTimestamp()
    };

    console.log(`[COURSE EDIT SUBMIT] Updating course ${courseId} with data:`, updatedData);

    try {
        const docRef = db.collection('golf_courses').doc(courseId);
        await docRef.update(updatedData);

        console.log(`[COURSE EDIT SUBMIT] Course ${courseId} updated successfully.`);
        alert("Course updated successfully!");
        closeEditCourseModal();

        // Refresh relevant UI sections
        console.log("[COURSE EDIT SUBMIT] Refreshing UI lists...");
        await populateGolfCourses(); // Refresh the list in the sports section

        // Refresh recent games table in case course name/location changed
        if (typeof populateRecentGolfGamesTable === 'function') {
            await populateRecentGolfGamesTable();
        }
        // Refresh live game dropdown if it exists and function is available
        if (typeof populateLiveGolfCourseSelect === 'function') {
            await populateLiveGolfCourseSelect();
        }
        // Refresh submit game dropdown if it exists and function is available
        if (typeof populateGolfCourseSelectForSubmit === 'function') {
            await populateGolfCourseSelectForSubmit();
        }


    } catch (error) {
        console.error(`[COURSE EDIT SUBMIT] Error updating course ${courseId}:`, error);
        if (errorMsgElement) errorMsgElement.textContent = `Error saving changes: ${error.message}`;
    } finally {
        submitButton.disabled = false;
    }
}

// --- Populate All Sports List (Sports Section) ---

function populateAllSportsList() {
    const listElement = document.getElementById('all-sports-list');
    if (!listElement) {
        console.warn("[SPORTS/ALL] All sports list element (#all-sports-list) not found in current DOM.");
        return;
    }
    if (typeof gameTypesConfig !== 'object' || gameTypesConfig === null) {
        console.error("[SPORTS/ALL] gameTypesConfig is not available or not an object.");
        listElement.innerHTML = '<p class="error-text col-span-full">Error loading activities configuration.</p>';
        return;
    }

    console.log("[SPORTS/ALL] Populating all sports list...");
    listElement.innerHTML = ''; // Clear loading message

    const sortedGames = Object.entries(gameTypesConfig).sort(([, nameA], [, nameB]) => nameA.localeCompare(nameB));

    if (sortedGames.length === 0) {
        listElement.innerHTML = '<p class="muted-text italic col-span-full">No activities configured.</p>';
        return;
    }

    sortedGames.forEach(([key, name]) => {
        const sportDiv = document.createElement('div');
        // Link to the new sport details section
        sportDiv.className = 'bg-gray-100 dark:bg-gray-700 p-3 rounded-lg text-center shadow hover:shadow-md transition-shadow';
        sportDiv.innerHTML = `
            <a href="#sport-details-section?sport=${key}" class="nav-link font-medium text-indigo-700 dark:text-indigo-400 hover:underline" data-target="sport-details-section">
                ${name}
            </a>
        `;
        // Add listener to handle navigation via showSection
        const link = sportDiv.querySelector('a');
        if (link) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                // Use showSection to navigate, passing the sport key
                if (typeof showSection === 'function') {
                    showSection('sport-details-section', true, { sport: key });
                } else {
                    console.error("showSection function not found for sport link navigation.");
                    // Fallback to direct hash change if showSection is missing
                    window.location.hash = `#sport-details-section?sport=${key}`;
                }
            });
        }
        listElement.appendChild(sportDiv);
    });

    console.log(`[SPORTS/ALL] Populated ${sortedGames.length} activities.`);
}


// Note: This file assumes that 'db', 'firebase', 'openModal', 'closeModal',
// 'populateLiveGolfCourseSelect', 'populateGolfCourseSelectForSubmit', 'populateRecentGolfGamesTable',
// 'gameTypesConfig', 'showSection'
// are initialized and accessible globally or imported.