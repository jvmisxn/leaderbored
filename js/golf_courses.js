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
    // Ensure db is accessible
    const listElement = document.getElementById('golf-courses-list'); //
    if (!listElement) { console.error("[SPORTS/GOLF] Golf courses list element (#golf-courses-list) not found."); return; } //
    if (!db) { console.error("[SPORTS/GOLF] Firestore DB not initialized."); listElement.innerHTML = '<p class="text-red-500 p-2">Error: Database connection failed.</p>'; return; } //

    console.log("[SPORTS/GOLF] Populating golf courses list..."); //
    listElement.innerHTML = '<p class="text-gray-500 dark:text-gray-400 p-2">Loading courses...</p>'; // Loading state (with dark mode class)

    try {
        // Query the 'golf_courses' collection, order by name
        // Requires Firestore index: golf_courses: name (asc)
        const snapshot = await db.collection('golf_courses').orderBy('name').get(); //

        if (snapshot.empty) {
            listElement.innerHTML = '<p class="text-gray-500 dark:text-gray-400 p-2 italic">No golf courses found. Use the "Add New Course" button.</p>'; // Added dark mode class
            return;
        }

        listElement.innerHTML = ''; // Clear loading message

        // Iterate through the courses and create list items
        snapshot.forEach(doc => {
            const course = { id: doc.id, ...doc.data() }; //
            const courseDiv = document.createElement('div'); //
            // Added dark mode classes
            courseDiv.className = 'border-b border-gray-200 dark:border-gray-700 pb-3 mb-3 last:border-b-0 last:pb-0 last:mb-0'; //

            // Basic course display
            courseDiv.innerHTML = `
                <div class="flex justify-between items-center">
                    <h4 class="text-lg font-semibold text-gray-800 dark:text-gray-200">${course.name || 'Unnamed Course'}</h4>
                    <span class="text-sm font-medium text-gray-600 dark:text-gray-400">Par: ${course.total_par || 'N/A'}</span>
                </div>
                ${course.location ? `<p class="text-xs text-gray-500 dark:text-gray-400">${course.location}</p>` : ''}
                `; //
            listElement.appendChild(courseDiv); //
        });

        console.log(`[SPORTS/GOLF] Populated ${snapshot.size} golf courses.`); //

    } catch (error) {
        console.error("[SPORTS/GOLF] Error fetching golf courses:", error); //
        if (error.code === 'failed-precondition') {
             listElement.innerHTML = '<p class="text-red-500 p-2">Error: Firestore index missing for sorting courses by name. Check console.</p>'; //
             console.error("Firestore index required: 'golf_courses' collection, 'name' field (ascending)."); //
        } else {
            listElement.innerHTML = `<p class="text-red-500 p-2">Error loading courses: ${error.message}</p>`; //
        }
    }
} // End populateGolfCourses

// Note: This file assumes that 'db', 'firebase', 'openModal', 'closeModal',
// 'populateLiveGolfCourseSelect' (potentially) are initialized and accessible globally or imported.