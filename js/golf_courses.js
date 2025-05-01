// --- golf_courses.js ---

/**
 * Ensures the global golf course cache is populated.
 */
async function ensureGolfCourseCache() {
    // Uses global golfCourseCachePopulated and globalGolfCourseCache
    if (golfCourseCachePopulated) return;
    if (!db) {
        console.error("[Golf Cache] DB not available.");
        return;
    }
    console.log("[Golf Cache] Populating golf course cache...");
    try {
        const snapshot = await db.collection('golf_courses').orderBy('name').get();
        globalGolfCourseCache = {}; // Reset global cache
        snapshot.forEach(doc => {
            // Fetch all data, including the new hole_details
            globalGolfCourseCache[doc.id] = { id: doc.id, ...doc.data() };
        });
        golfCourseCachePopulated = true; // Set global flag
        console.log(`[Golf Cache] Cached ${snapshot.size} courses globally.`);
    } catch (error) {
        console.error("[Golf Cache] Error fetching courses for cache:", error);
        // Don't block execution, but log the error
        golfCourseCachePopulated = false; // Ensure flag is false on error
    }
}

// --- Add Course Page Functions ---

/**
 * Generates the HTML string for the Add Course form.
 * @returns {string} HTML string for the form.
 */
function generateAddCourseFormHTML() {
    console.log("[Golf Add Form] Generating HTML...");
    let holeInputsHTML = '';
    for (let i = 1; i <= 18; i++) {
        holeInputsHTML += `
            <fieldset class="mb-3 p-3 border rounded dark:border-gray-600">
                <legend class="text-sm font-medium px-1">Hole ${i}</legend>
                <div class="grid grid-cols-2 md:grid-cols-5 gap-2">
                    <div>
                        <label for="hole-${i}-par" class="block text-xs font-medium text-gray-600 dark:text-gray-400">Par</label>
                        <input type="number" id="hole-${i}-par" name="hole-${i}-par" min="3" max="6" class="input-field-sm w-full" required>
                    </div>
                    <div>
                        <label for="hole-${i}-yards-blue" class="block text-xs font-medium text-blue-600 dark:text-blue-400">Yards (Blue)</label>
                        <input type="number" id="hole-${i}-yards-blue" name="hole-${i}-yards-blue" min="50" max="700" class="input-field-sm w-full" required>
                    </div>
                    <div>
                        <label for="hole-${i}-yards-white" class="block text-xs font-medium text-gray-700 dark:text-gray-300">Yards (White)</label>
                        <input type="number" id="hole-${i}-yards-white" name="hole-${i}-yards-white" min="50" max="700" class="input-field-sm w-full" required>
                    </div>
                    <div>
                        <label for="hole-${i}-yards-gold" class="block text-xs font-medium text-yellow-600 dark:text-yellow-400">Yards (Gold)</label>
                        <input type="number" id="hole-${i}-yards-gold" name="hole-${i}-yards-gold" min="50" max="700" class="input-field-sm w-full">
                    </div>
                    <div>
                        <label for="hole-${i}-yards-red" class="block text-xs font-medium text-red-600 dark:text-red-400">Yards (Red)</label>
                        <input type="number" id="hole-${i}-yards-red" name="hole-${i}-yards-red" min="50" max="700" class="input-field-sm w-full">
                    </div>
                </div>
            </fieldset>
        `;
    }

    const formHTML = `
        <form id="add-course-form">
            <div class="mb-4">
                <label for="course-name" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Course Name:</label>
                <input type="text" id="course-name" name="course-name" class="input-field w-full" required>
            </div>
            <div class="mb-4">
                <label for="course-location" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Location (Optional):</label>
                <input type="text" id="course-location" name="course-location" class="input-field w-full" placeholder="e.g., City, State">
            </div>

            <h3 class="text-lg font-semibold mt-6 mb-3 text-gray-800 dark:text-gray-200">Hole Details (1-18)</h3>
            <div class="space-y-4 max-h-[50vh] overflow-y-auto pr-2"> <!-- Added max-height and scroll -->
                ${holeInputsHTML}
            </div>

            <p id="add-course-error" class="text-red-500 text-sm mt-4 h-4"></p>
            <div class="mt-6 flex justify-end space-x-3 sticky bottom-0 bg-white dark:bg-gray-800 py-3 border-t dark:border-gray-700 -mx-8 px-8 rounded-b-lg"> <!-- Adjusted padding/margin for sticky footer -->
                <!-- Changed Cancel button to a link -->
                <a href="#golf-courses-section" class="button button-secondary nav-link" data-target="golf-courses-section">Cancel</a>
                <button type="submit" class="button button-primary">Add Course</button>
            </div>
        </form>
    `;
    return formHTML;
}

/**
 * Sets up the Add Golf Course page section.
 * Injects the form and attaches the submit listener.
 */
function setupAddGolfCoursePage() {
    console.log("[Golf Add Page] Setting up...");
    const formContainer = document.getElementById('add-course-form-container');
    if (!formContainer) {
        console.error("[Golf Add Page] Form container (#add-course-form-container) not found.");
        return;
    }
    if (!db) {
        console.error("[Golf Add Page] DB not ready.");
        formContainer.innerHTML = '<p class="error-text">Database connection error.</p>';
        return;
    }

    // Generate and inject the form HTML
    formContainer.innerHTML = generateAddCourseFormHTML();

    // Attach the submit listener to the newly injected form
    const formElement = formContainer.querySelector('#add-course-form');
    if (formElement) {
        formElement.removeEventListener('submit', handleAddCourseSubmit); // Prevent duplicates if re-navigating
        formElement.addEventListener('submit', handleAddCourseSubmit);
        console.log("[Golf Add Page] Submit listener attached to form.");
    } else {
        console.error("[Golf Add Page] Could not find form element (#add-course-form) after injection.");
    }
}


// Handles submission of the Add Course form (from the page)
async function handleAddCourseSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const errorElement = form.querySelector('#add-course-error');
    if (!db || !firebase || !firebase.firestore) { alert("Database connection or Firestore components missing."); return; }

    if (errorElement) errorElement.textContent = '';
    submitButton.disabled = true;
    submitButton.textContent = 'Adding...';

    let isValid = true;
    form.querySelectorAll('input[required], input[type="number"]').forEach(field => { // Include number inputs for range checks
        field.classList.remove('border-red-500');
        if (field.required && !field.value.trim()) {
            isValid = false;
            field.classList.add('border-red-500');
            if (errorElement && !errorElement.textContent) errorElement.textContent = "Please fill all required fields.";
        }
        if (field.type === 'number' && field.value) { // Check ranges only if a value is entered
            const val = parseFloat(field.value);
            const min = parseFloat(field.min);
            const max = parseFloat(field.max);
            if (isNaN(val) || (field.hasAttribute('min') && val < min) || (field.hasAttribute('max') && val > max)) {
                isValid = false;
                field.classList.add('border-red-500');
                if (errorElement && !errorElement.textContent) errorElement.textContent = `Invalid value for ${field.labels?.[0]?.textContent || field.name}. Check ranges (${field.min}-${field.max}).`;
            }
        }
    });

    if (!isValid) {
        if (errorElement && !errorElement.textContent) errorElement.textContent = "Please correct the highlighted fields.";
        submitButton.disabled = false;
        submitButton.textContent = 'Add Course';
        alert("Please fill out all required fields correctly. Check ranges for Par and Yardages.");
        return;
    }

    const formData = new FormData(form);
    const courseName = formData.get('course-name')?.trim();
    const courseLocation = formData.get('course-location')?.trim() || null;

    if (!courseName) {
        if (errorElement) errorElement.textContent = "Course name is required.";
        submitButton.disabled = false;
        submitButton.textContent = 'Add Course';
        return;
    }

    const hole_details = [];
    let totalPar = 0;
    for (let i = 1; i <= 18; i++) {
        const par = parseInt(formData.get(`hole-${i}-par`), 10);
        totalPar += par;
        hole_details.push({
            hole: i,
            par: par,
            yards: {
                blue: parseInt(formData.get(`hole-${i}-yards-blue`), 10),
                white: parseInt(formData.get(`hole-${i}-yards-white`), 10),
                gold: parseInt(formData.get(`hole-${i}-yards-gold`), 10) || null,
                red: parseInt(formData.get(`hole-${i}-yards-red`), 10) || null,
            }
        });
    }

    console.log(`[ADD COURSE] Attempting to add course: ${courseName}`);

    try {
        const courseData = {
            name: courseName,
            location: courseLocation,
            total_par: totalPar,
            hole_details: hole_details,
            date_created: firebase.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await db.collection('golf_courses').add(courseData);
        console.log(`[FIRESTORE] Course "${courseName}" added successfully with ID: ${docRef.id}`);
        alert(`Course "${courseName}" added successfully!`);

        golfCourseCachePopulated = false; // Invalidate cache
        await ensureGolfCourseCache(); // Re-populate global cache

        // Refresh relevant UI elements (dropdowns)
        if (typeof populateLiveGolfCourseSelect === 'function') {
             console.log("[ADD COURSE] Refreshing live golf course select dropdown...");
             await populateLiveGolfCourseSelect();
        }
        if (typeof populateGolfCourseSelectForSubmit === 'function') {
            console.log("[ADD COURSE] Refreshing submit past game golf course select dropdown...");
            await populateGolfCourseSelectForSubmit();
        }

        // Navigate back to the golf courses list and force refresh
        if (typeof showSection === 'function') {
            showSection('golf-courses-section', true);
        } else {
            window.location.hash = '#golf-courses-section'; // Fallback
        }

    } catch (error) {
        console.error("Error adding course:", error);
        if (errorElement) errorElement.textContent = `Error: ${error.message}`;
        alert(`Failed to add course: ${error.message}`);
    } finally {
        // Re-enable button even if navigation happens, in case of errors before navigation
        submitButton.disabled = false;
        submitButton.textContent = 'Add Course';
    }
} // End handleAddCourseSubmit

// --- Populate Golf Courses List (Sports Section) ---

/**
 * Populates a list element with golf courses.
 * @param {HTMLElement} listElement - The container element (e.g., a div or ul) to populate.
 */
async function populateGolfCourses(listElement) {
    console.log("[SPORTS/GOLF] Populating golf courses list...");

    if (!listElement) {
        console.error("[SPORTS/GOLF] Target element for golf courses list not provided.");
        return;
    }

    listElement.innerHTML = `<p class="loading-text">Loading courses...</p>`;

    if (!db) {
        console.error("[SPORTS/GOLF] DB not available.");
        listElement.innerHTML = `<p class="error-text">Error: Database connection failed.</p>`;
        return;
    }

    await ensureGolfCourseCache();

    if (!golfCourseCachePopulated || Object.keys(globalGolfCourseCache).length === 0) {
         listElement.innerHTML = `<p class="muted-text italic">No golf courses found.</p>`;
         return;
    }

    const courses = Object.values(globalGolfCourseCache);

    let html = '<ul class="space-y-2 text-sm">';

    courses.forEach(course => {
        let totalYardsWhite = 'N/A';
        if (course.hole_details && Array.isArray(course.hole_details)) {
            totalYardsWhite = course.hole_details.reduce((sum, hole) => sum + (hole.yards?.white || 0), 0);
        }

        html += `
            <li class="flex justify-between items-start border-b border-gray-200 dark:border-gray-700 pb-2 last:border-b-0">
                <div class="flex-grow mr-2">
                    <strong class="font-medium">${course.name || 'Unnamed Course'}</strong>
                    <span class="text-gray-500 dark:text-gray-400 text-xs"> (Par ${course.total_par || 'N/A'})</span>
                    ${course.location ? `<br><span class="text-gray-500 dark:text-gray-400 text-xs">${course.location}</span>` : ''}
                    <br><span class="text-gray-500 dark:text-gray-400 text-xs">White Tees: ${totalYardsWhite} yds</span>
                </div>
                <button class="edit-course-btn button button-xs button-secondary admin-only flex-shrink-0 mt-1" data-course-id="${course.id}">Edit</button>
            </li>
        `;
    });

    html += '</ul>';
    listElement.innerHTML = html;

    listElement.querySelectorAll('.edit-course-btn').forEach(btn => {
        btn.removeEventListener('click', handleEditCourseButtonClick);
        btn.addEventListener('click', handleEditCourseButtonClick);
    });

    if (typeof handleAuthChange === 'function' && typeof auth !== 'undefined') {
        handleAuthChange(auth.currentUser);
    }

    console.log(`[SPORTS/GOLF] Displayed ${courses.length} courses.`);
}

/**
 * Handles the click event for the "Edit Course" button.
 * @param {Event} event
 */
function handleEditCourseButtonClick(event) {
    const courseId = event.target.dataset.courseId;
    if (!courseId) {
        console.error("[SPORTS/GOLF] Edit button clicked without course ID.");
        return;
    }
    console.log(`[SPORTS/GOLF] Edit button clicked for course: ${courseId}`);
    if (typeof openEditCourseModal === 'function') {
        openEditCourseModal(courseId);
    } else {
        console.error("openEditCourseModal function not found.");
    }
}

// --- Edit Course Modal ---

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
        await ensureGolfCourseCache();
        const course = globalGolfCourseCache[courseId];

        if (!course) {
            throw new Error("Golf course not found in cache or DB.");
        }

        let holeInputsHTML = '';
        for (let i = 1; i <= 18; i++) {
            const holeData = course.hole_details?.find(h => h.hole === i) || {};
            const par = holeData.par || '';
            const yardsBlue = holeData.yards?.blue || '';
            const yardsWhite = holeData.yards?.white || '';
            const yardsGold = holeData.yards?.gold || '';
            const yardsRed = holeData.yards?.red || '';

            holeInputsHTML += `
                <fieldset class="mb-3 p-3 border rounded dark:border-gray-600">
                    <legend class="text-sm font-medium px-1">Hole ${i}</legend>
                    <div class="grid grid-cols-2 md:grid-cols-5 gap-2">
                        <div>
                            <label for="edit-hole-${i}-par" class="block text-xs font-medium text-gray-600 dark:text-gray-400">Par</label>
                            <input type="number" id="edit-hole-${i}-par" name="hole-${i}-par" value="${par}" min="3" max="6" class="input-field-sm w-full" required>
                        </div>
                        <div>
                            <label for="edit-hole-${i}-yards-blue" class="block text-xs font-medium text-blue-600 dark:text-blue-400">Yards (Blue)</label>
                            <input type="number" id="edit-hole-${i}-yards-blue" name="hole-${i}-yards-blue" value="${yardsBlue}" min="50" max="700" class="input-field-sm w-full" required>
                        </div>
                        <div>
                            <label for="edit-hole-${i}-yards-white" class="block text-xs font-medium text-gray-700 dark:text-gray-300">Yards (White)</label>
                            <input type="number" id="edit-hole-${i}-yards-white" name="hole-${i}-yards-white" value="${yardsWhite}" min="50" max="700" class="input-field-sm w-full" required>
                        </div>
                        <div>
                            <label for="edit-hole-${i}-yards-gold" class="block text-xs font-medium text-yellow-600 dark:text-yellow-400">Yards (Gold)</label>
                            <input type="number" id="edit-hole-${i}-yards-gold" name="hole-${i}-yards-gold" value="${yardsGold}" min="50" max="700" class="input-field-sm w-full">
                        </div>
                        <div>
                            <label for="edit-hole-${i}-yards-red" class="block text-xs font-medium text-red-600 dark:text-red-400">Yards (Red)</label>
                            <input type="number" id="edit-hole-${i}-yards-red" name="hole-${i}-yards-red" value="${yardsRed}" min="50" max="700" class="input-field-sm w-full">
                        </div>
                    </div>
                </fieldset>
            `;
        }

        const modalContentHTML = `
            <div class="modal-content max-h-[85vh] overflow-y-auto">
                <button id="close-edit-course-modal-btn" class="modal-close-button">&times;</button>
                <h2 class="text-2xl font-semibold mb-5 text-indigo-700 dark:text-indigo-400">Edit Golf Course</h2>
                <form id="edit-course-form" data-course-id="${course.id}">
                    <div class="mb-4">
                        <label for="edit-course-name" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Course Name:</label>
                        <input type="text" id="edit-course-name" name="course-name" value="${course.name || ''}" class="input-field w-full" required>
                    </div>
                    <div class="mb-4">
                        <label for="edit-course-location" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Location (Optional):</label>
                        <input type="text" id="edit-course-location" name="course-location" value="${course.location || ''}" class="input-field w-full" placeholder="e.g., City, State">
                    </div>

                    <h3 class="text-lg font-semibold mt-6 mb-3 text-gray-800 dark:text-gray-200">Hole Details (1-18)</h3>
                    <div class="space-y-4">
                        ${holeInputsHTML}
                    </div>

                    <p id="edit-course-error" class="text-red-500 text-sm mt-4 h-4"></p>
                    <div class="mt-6 flex justify-end space-x-3 sticky bottom-0 bg-white dark:bg-gray-800 py-3 border-t dark:border-gray-700">
                        <button type="button" id="cancel-edit-course-modal-btn" class="button button-secondary">Cancel</button>
                        <button type="submit" class="button button-primary">Save Changes</button>
                    </div>
                </form>
            </div>`;

        modalElement.innerHTML = modalContentHTML;

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
    submitButton.textContent = 'Saving...';
    if (errorMsgElement) errorMsgElement.textContent = '';

    let isValid = true;
    form.querySelectorAll('input[required]').forEach(field => {
        field.classList.remove('border-red-500');
        if (!field.value.trim()) {
            isValid = false;
            field.classList.add('border-red-500');
            if (errorMsgElement && !errorMsgElement.textContent) errorMsgElement.textContent = "Please fill all required fields.";
        }
        if (field.type === 'number') {
            const val = parseFloat(field.value);
            const min = parseFloat(field.min);
            const max = parseFloat(field.max);
            if (isNaN(val) || (field.min && val < min) || (field.max && val > max)) {
                isValid = false;
                field.classList.add('border-red-500');
                if (errorMsgElement && !errorMsgElement.textContent) errorMsgElement.textContent = `Invalid value for ${field.labels?.[0]?.textContent || field.name}. Check ranges.`;
            }
        }
    });

    if (!isValid) {
        if (errorMsgElement && !errorMsgElement.textContent) errorMsgElement.textContent = "Please correct the highlighted fields.";
        submitButton.disabled = false;
        submitButton.textContent = 'Save Changes';
        alert("Please fill out all required fields correctly. Check ranges for Par and Yardages.");
        return;
    }

    const formData = new FormData(form);
    const hole_details = [];
    let totalPar = 0;
    for (let i = 1; i <= 18; i++) {
        const par = parseInt(formData.get(`hole-${i}-par`), 10);
        totalPar += par;
        hole_details.push({
            hole: i,
            par: par,
            yards: {
                blue: parseInt(formData.get(`hole-${i}-yards-blue`), 10),
                white: parseInt(formData.get(`hole-${i}-yards-white`), 10),
                gold: parseInt(formData.get(`hole-${i}-yards-gold`), 10) || null,
                red: parseInt(formData.get(`hole-${i}-yards-red`), 10) || null,
            }
        });
    }

    const updatedData = {
        name: formData.get('course-name')?.trim(),
        location: formData.get('course-location')?.trim() || null, // Store null if empty
        total_par: totalPar, // Recalculate total par
        hole_details: hole_details, // Store updated hole details
        last_updated: firebase.firestore.FieldValue.serverTimestamp()
    };

    console.log(`[COURSE EDIT SUBMIT] Updating course ${courseId} with data:`, updatedData);

    try {
        const docRef = db.collection('golf_courses').doc(courseId);
        await docRef.update(updatedData);

        console.log(`[COURSE EDIT SUBMIT] Course ${courseId} updated successfully.`);
        alert("Course updated successfully!");

        golfCourseCachePopulated = false;
        await ensureGolfCourseCache(); // Re-populate global cache

        closeEditCourseModal();

        console.log("[COURSE EDIT SUBMIT] Refreshing UI lists...");
        await populateGolfCourses(document.getElementById('golf-courses-list'));

        if (typeof populateLiveGolfCourseSelect === 'function') {
            await populateLiveGolfCourseSelect();
        }
        if (typeof populateGolfCourseSelectForSubmit === 'function') {
            await populateGolfCourseSelectForSubmit();
        }

    } catch (error) {
        console.error(`[COURSE EDIT SUBMIT] Error updating course ${courseId}:`, error);
        if (errorMsgElement) errorMsgElement.textContent = `Error saving changes: ${error.message}`;
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Save Changes';
    }
}

console.log("[Golf Courses] golf_courses.js loaded.");