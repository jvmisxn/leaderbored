// --- golf_courses.js ---

let golfCoursesCache = {};
let golfCoursesCachePopulated = false;
let isFetchingGolfCourses = false; // Flag to prevent concurrent fetches

/**
 * Fetches all golf courses from Firestore and caches them.
 * Processes tee box data from the hole_details array.
 */
async function fetchAllGolfCourses() {
    // If already populated, return immediately
    if (golfCoursesCachePopulated) {
        console.log("[Golf Courses] Using cached golf courses.");
        return;
    }
    // If currently fetching, wait for it to complete (simple approach)
    if (isFetchingGolfCourses) {
        console.log("[Golf Courses] Waiting for ongoing fetch to complete...");
        // Poll or use a promise queue for more robust waiting if needed
        await new Promise(resolve => setTimeout(resolve, 100)); // Simple wait
        return fetchAllGolfCourses(); // Re-check status after waiting
    }

    isFetchingGolfCourses = true; // Set fetching flag

    try {
        console.log("[Golf Courses] Fetching golf courses from Firestore...");
        const snapshot = await db.collection('golf_courses').get();
        const courses = {};

        snapshot.forEach(doc => {
            const courseData = doc.data();
            const courseId = doc.id;
            const course = { id: courseId, ...courseData, tees: {} }; // Initialize tees object

            // Check if hole_details exists and is a non-empty array before processing
            if (courseData.hole_details && Array.isArray(courseData.hole_details) && courseData.hole_details.length > 0) {
                // --- MODIFIED: Process hole_details based on provided structure ---
                courseData.hole_details.forEach(holeDetail => {
                    const holeNumber = holeDetail.hole;
                    const holePar = holeDetail.par;
                    const yardsMap = holeDetail.yards;
                    const holeIndex = holeNumber - 1; // 0-based index

                    if (holeIndex >= 0 && holeIndex < 18 && yardsMap && typeof yardsMap === 'object') {
                        Object.entries(yardsMap).forEach(([teeColor, yardage]) => {
                            // Ensure we only process the standard tee colors
                            const lowerTeeColor = teeColor.toLowerCase();
                            if (['red', 'gold', 'white', 'blue'].includes(lowerTeeColor)) {
                                // Initialize tee object if it doesn't exist
                                if (!course.tees[lowerTeeColor]) {
                                    course.tees[lowerTeeColor] = {
                                        id: lowerTeeColor,
                                        name: lowerTeeColor.charAt(0).toUpperCase() + lowerTeeColor.slice(1),
                                        par: Array(18).fill(null),
                                        yardage: Array(18).fill(null),
                                        handicap: Array(18).fill(null) // Keep handicap array, though not in source data
                                    };
                                }
                                // Assign par and yardage for the current hole and tee
                                course.tees[lowerTeeColor].par[holeIndex] = holePar ?? null;
                                course.tees[lowerTeeColor].yardage[holeIndex] = yardage ?? null;
                                // Handicap data is not in the provided structure, so it remains null
                            }
                        });
                    }
                });
                 // --- END MODIFIED ---
            } else {
                // Log a warning if hole_details are missing or invalid
                console.warn(`[Golf Courses] Course ${courseId} (${courseData.name || 'Unnamed'}) is missing valid 'hole_details' array. Tee data cannot be processed.`);
            }

            courses[courseId] = course;
        });

        golfCoursesCache = courses;
        golfCoursesCachePopulated = true;
        console.log(`[Golf Courses] Fetched and cached ${Object.keys(golfCoursesCache).length} courses. Processed tee data from hole_details.`);
    } catch (error) {
        console.error("[Golf Courses] Error fetching golf courses:", error);
        golfCoursesCache = {}; // Reset cache on error
        golfCoursesCachePopulated = false;
    } finally {
        isFetchingGolfCourses = false; // Reset fetching flag
    }
}

/**
 * Populates a select dropdown element with golf course options.
 * @param {HTMLSelectElement} selectElement - The select element to populate.
 * @param {string} [prompt='Select Course'] - The default prompt option text.
 * @param {string|null} [selectedValue=null] - The ID of the course to pre-select.
 */
async function populateGolfCourseDropdown(selectElement, prompt = 'Select Course', selectedValue = null) {
    if (!selectElement) {
        console.warn("[Golf Courses] populateGolfCourseDropdown: Select element not provided.");
        return;
    }
    selectElement.innerHTML = `<option value="">-- ${prompt} --</option>`; // Clear and add prompt
    selectElement.disabled = true; // Disable while loading

    try {
        // Ensure cache is populated (includes waiting for tee data)
        if (!golfCoursesCachePopulated) {
            await fetchAllGolfCourses();
        }
        const courses = golfCoursesCache;
        const coursesArray = Object.values(courses);

        if (coursesArray.length === 0) {
            selectElement.innerHTML += `<option value="" disabled>No courses found</option>`;
        } else {
            coursesArray.forEach(course => {
                const option = new Option(`${course.name}${course.location ? ` (${course.location})` : ''}`, course.id);
                selectElement.add(option);
            });
        }

        // Set selected value if provided and exists
        if (selectedValue && selectElement.querySelector(`option[value="${selectedValue}"]`)) {
            selectElement.value = selectedValue;
        } else if (selectedValue) {
            console.warn(`[Golf Courses] Could not select course value "${selectedValue}" in ${selectElement.id}.`);
        }

    } catch (error) {
        console.error("[Golf Courses] Error populating course dropdown:", error);
        selectElement.innerHTML += `<option value="" disabled>Error loading courses</option>`;
    } finally {
        selectElement.disabled = false; // Re-enable dropdown
    }
}

/**
 * Populates a select dropdown element with available tee box options for a specific course.
 * @param {HTMLSelectElement} selectElement - The select element to populate.
 * @param {string} courseId - The ID of the selected golf course.
 */
async function populateTeeBoxDropdown(selectElement, courseId) {
    if (!selectElement || !courseId) {
        console.error("[Golf Courses] Missing select element or course ID for tee box population.");
        if (selectElement) selectElement.innerHTML = '<option value="">Error</option>';
        return;
    }

    selectElement.innerHTML = '<option value="">Loading Tees...</option>';
    selectElement.disabled = true;

    try {
        // Ensure the cache is fully populated, including tee data, before proceeding
        if (!golfCoursesCachePopulated) {
            console.log("[Golf Courses] Tee population waiting for course cache...");
            await fetchAllGolfCourses(); // Wait for the fetch (including tees) to complete
        }

        const course = golfCoursesCache[courseId];

        // Check if course and tee data exist *after* ensuring cache is populated
        if (!course || !course.tees || Object.keys(course.tees).length === 0) {
            // --- REFINED Warning Message --- 
            console.warn(`[Golf Courses] No tee data processed or found for course ID: ${courseId} in cache. Check if course has 'hole_details' in Firestore.`);
            // --- END REFINED --- 
            selectElement.innerHTML = '<option value="">No Tees Available</option>';
            selectElement.disabled = true; // Keep disabled if no tees
            return;
        }

        // --- MODIFIED: Custom Sort Order for Tees ---
        const desiredTeeOrder = ['red', 'gold', 'white', 'blue'];
        const availableTees = Object.keys(course.tees);

        // Filter available tees to only include those in the desired order
        // and sort them according to the desired order
        const sortedTees = availableTees
            .filter(tee => desiredTeeOrder.includes(tee.toLowerCase())) // Ensure case-insensitivity if needed
            .sort((a, b) => {
                const indexA = desiredTeeOrder.indexOf(a.toLowerCase());
                const indexB = desiredTeeOrder.indexOf(b.toLowerCase());
                return indexA - indexB;
            });
        // --- END MODIFIED ---

        if (sortedTees.length > 0) {
            selectElement.innerHTML = '<option value="">-- Select Tee Box --</option>'; // Default option
            sortedTees.forEach(teeKey => { // Use sortedTees instead of teeColors
                const teeData = course.tees[teeKey];
                const option = document.createElement('option');
                option.value = teeKey; // Use the original key (e.g., 'red') as value
                // Use the name from teeData if available, otherwise capitalize the key
                option.textContent = teeData.name || (teeKey.charAt(0).toUpperCase() + teeKey.slice(1));
                selectElement.appendChild(option);
            });
            selectElement.disabled = false; // Enable select
            console.log(`[Golf Courses] Populated tee box dropdown for course ${courseId} with options (custom order): `, sortedTees);
        } else {
            selectElement.innerHTML = '<option value="">No Tees Defined</option>';
            selectElement.disabled = true;
        }

    } catch (error) {
        console.error(`[Golf Courses] Error populating tee boxes for course ${courseId}:`, error);
        selectElement.innerHTML = '<option value="">Error loading tees</option>';
        selectElement.disabled = true; // Keep disabled on error
    } finally {
        selectElement.disabled = false; // Re-enable dropdown
    }
}

/**
 * Retrieves the par and yardage data for a specific course and tee color.
 * @param {string} courseId - The ID of the golf course.
 * @param {string} teeColor - The key of the selected tee (e.g., 'white', 'blue').
 * @returns {Promise<object|null>} An object containing { par: {...}, yardage: {...} } or null if not found.
 */
async function getTeeBoxData(courseId, teeColor) {
    if (!courseId || !teeColor) return null;

    try {
        // Ensure cache is populated
        if (!golfCoursesCachePopulated) {
            await fetchAllGolfCourses();
        }
        const course = golfCoursesCache ? golfCoursesCache[courseId] : null;
        const teeData = course?.tees?.[teeColor];

        if (teeData && teeData.par && teeData.yardage) {
            return {
                par: teeData.par,
                yardage: teeData.yardage
            };
        } else {
            console.warn(`[Golf Courses] Tee data not found for course ${courseId}, tee ${teeColor}`);
            return null;
        }
    } catch (error) {
        console.error(`[Golf Courses] Error getting tee box data for ${courseId} / ${teeColor}:`, error);
        return null;
    }
}

/**
 * Sets up the "Add Golf Course" form, including generating par inputs and attaching submit listener.
 */
function setupAddGolfCourseForm() {
    console.log("[Golf Courses] Setting up Add Golf Course form...");
    const form = document.getElementById('add-golf-course-form');
    const parInputsContainer = document.getElementById('par-inputs-container');
    const errorElement = form?.querySelector('#add-course-error');

    if (!form || !parInputsContainer || !errorElement) {
        console.error("[Golf Courses] Add Golf Course form or required elements not found.");
        const section = document.getElementById('add-golf-course-section');
        if (section) section.innerHTML = '<p class="error-text text-center py-10">Error loading form structure.</p>';
        return;
    }

    // 1. Generate Par Input Fields dynamically
    let parInputsHtml = '';
    for (let i = 1; i <= 18; i++) {
        parInputsHtml += `
            <div>
                <label for="par-hole-${i}" class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">Hole ${i}:</label>
                <input type="number" id="par-hole-${i}" name="par_hole_${i}" class="input-field-sm w-full text-center" min="1" max="10" required value="4">
            </div>`;
    }
    parInputsContainer.innerHTML = parInputsHtml;

    // 2. Attach Submit Listener (ensure only one is attached)
    if (!form.dataset.listenerAttached) {
        form.addEventListener('submit', handleAddGolfCourseSubmit);
        form.dataset.listenerAttached = 'true';
        console.log("[Golf Courses] Attached submit listener to Add Golf Course form.");
    } else {
        console.log("[Golf Courses] Submit listener already attached to Add Golf Course form.");
    }
}

/**
 * Handles the submission of the Add Golf Course form.
 */
async function handleAddGolfCourseSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const errorElement = form.querySelector('#add-course-error');
    if (!db) { alert("Database connection error."); return; }

    if (errorElement) errorElement.textContent = '';
    submitButton.disabled = true;
    submitButton.textContent = 'Adding...';

    try {
        const courseName = form.querySelector('#course-name').value.trim();
        const courseLocation = form.querySelector('#course-location').value.trim();

        if (!courseName || !courseLocation) {
            throw new Error("Course Name and Location are required.");
        }

        const parValues = {};
        let totalPar = 0;
        let isValid = true;
        for (let i = 1; i <= 18; i++) {
            const input = form.querySelector(`#par-hole-${i}`);
            const par = parseInt(input.value, 10);
            if (isNaN(par) || par < 1 || par > 10) {
                input.classList.add('border-red-500');
                isValid = false;
            } else {
                input.classList.remove('border-red-500');
                parValues[`hole_${i}`] = par;
                totalPar += par;
            }
        }

        if (!isValid) {
            throw new Error("Please enter valid par values (1-10) for all holes.");
        }

        const courseData = {
            name: courseName,
            location: courseLocation,
            par: parValues,
            total_par: totalPar,
            date_added: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Add course to Firestore
        const docRef = await db.collection('golf_courses').add(courseData);
        console.log(`[FIRESTORE] Golf course "${courseName}" added successfully with ID: ${docRef.id}`);
        alert(`Golf course "${courseName}" added successfully!`);

        // Clear cache and potentially refresh dropdowns if needed
        golfCoursesCache = null;
        golfCoursesCachePopulated = false;
        // Example: If a course dropdown is visible, refresh it
        const liveCourseSelect = document.getElementById('live-golf-course-select');
        if (liveCourseSelect && liveCourseSelect.closest('section')?.style.display !== 'none') {
            await populateGolfCourseDropdown(liveCourseSelect);
        }
        const submitCourseSelect = document.getElementById('game-golf-course-select');
        if (submitCourseSelect && submitCourseSelect.closest('section')?.style.display !== 'none') {
            await populateGolfCourseDropdown(submitCourseSelect);
        }

        form.reset(); // Reset form fields
        // Optionally navigate away or show success message inline
        if (typeof showSection === 'function') {
            showSection('sports-section'); // Go back to sports list after adding
        }

    } catch (error) {
        console.error("Error adding golf course:", error);
        if (errorElement) errorElement.textContent = `Error: ${error.message}`;
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Add Course';
    }
}

console.log("[Golf Courses] golf_courses.js loaded");