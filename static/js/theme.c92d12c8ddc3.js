(() => {
    'use strict'
    
    // --- Light/Dark Mode Toggle ---
    const getStoredTheme = () => localStorage.getItem('theme')
    const setStoredTheme = theme => localStorage.setItem('theme', theme)
    const getPreferredTheme = () => {
        const storedTheme = getStoredTheme()
        if (storedTheme) return storedTheme
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    const setTheme = theme => {
        document.documentElement.setAttribute('data-bs-theme', theme)
        
        // Tailwind CSS Compatibility: toggle 'dark' class on the html element
        if (theme === 'dark') {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
        
        const btn = document.querySelector('.btn-theme-toggle i')
        if (btn) {
            btn.className = theme === 'dark' ? 'bi bi-sun' : 'bi bi-moon-stars'
        }
    }
    
    setTheme(getPreferredTheme())

    // --- Dynamic Modal System for Static Archive Notice ---
    const showArchiveModal = (title, message) => {
        let modal = document.getElementById('archive-modal')
        if (!modal) {
            modal = document.createElement('div')
            modal.id = 'archive-modal'
            modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-60 backdrop-blur-sm transition-opacity duration-300 opacity-0 pointer-events-none'
            modal.innerHTML = `
                <div class="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700 transform scale-95 transition-transform duration-300">
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center space-x-3">
                            <div class="p-2 bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 rounded-lg">
                                <i class="bi bi-archive-fill text-xl"></i>
                            </div>
                            <h3 class="text-lg font-bold text-gray-900 dark:text-white modal-title">Static Archive</h3>
                        </div>
                        <button type="button" class="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 modal-close focus:outline-none">
                            <i class="bi bi-x-lg text-lg"></i>
                        </button>
                    </div>
                    <div class="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-6 modal-message">
                        This is a static archive.
                    </div>
                    <div class="flex justify-end">
                        <button type="button" class="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg text-sm transition-colors duration-200 modal-close-btn focus:outline-none focus:ring-2 focus:ring-primary-500">
                            Got it, thanks
                        </button>
                    </div>
                </div>
            `
            document.body.appendChild(modal)
            
            // Add close event handlers
            const closeElements = modal.querySelectorAll('.modal-close, .modal-close-btn')
            closeElements.forEach(el => {
                el.addEventListener('click', hideArchiveModal)
            })
            modal.addEventListener('click', (e) => {
                if (e.target === modal) hideArchiveModal()
            })
        }
        
        // Set modal title and message
        modal.querySelector('.modal-title').innerHTML = title
        modal.querySelector('.modal-message').innerHTML = message
        
        // Show modal with animation
        modal.classList.remove('opacity-0', 'pointer-events-none')
        modal.classList.add('opacity-100')
        modal.querySelector('.transform').classList.remove('scale-95')
        modal.querySelector('.transform').classList.add('scale-100')
        document.body.classList.add('overflow-hidden')
    }

    const hideArchiveModal = () => {
        const modal = document.getElementById('archive-modal')
        if (modal) {
            modal.classList.remove('opacity-100')
            modal.classList.add('opacity-0', 'pointer-events-none')
            modal.querySelector('.transform').classList.remove('scale-100')
            modal.querySelector('.transform').classList.add('scale-95')
            document.body.classList.remove('overflow-hidden')
        }
    }

    // --- HTML Helper Utilities for Search Engine ---
    const escapeHtml = (str) => {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;")
    }

    const truncateWords = (str, num) => {
        const cleanStr = str.replace(/<\/?[^>]+(>|$)/g, "") // Strip HTML tags
        const words = cleanStr.split(/\s+/)
        if (words.length <= num) return cleanStr
        return words.slice(0, num).join(" ") + "..."
    }

    // --- Client-Side Search Engine ---
    const performClientSideSearch = async (query) => {
        const latestDiv = document.getElementById('latest')
        if (!latestDiv) return

        // Replace the "Featured Insights" header with a "Search Results" header
        const headerContainer = latestDiv.querySelector('.flex.justify-between.items-end.mb-12') || latestDiv.querySelector('.mb-12')
        if (headerContainer) {
            headerContainer.outerHTML = `
                <div class="mb-12">
                    <h2 class="text-3xl font-bold dark:text-white">Search Results</h2>
                    <p class="text-gray-500 dark:text-gray-400 mt-2" id="search-count">Searching for "${escapeHtml(query)}"...</p>
                    <a href="/" class="inline-flex items-center mt-4 text-primary-600 hover:underline">
                        <i class="bi bi-arrow-left mr-2"></i>Clear Search
                    </a>
                </div>
            `
        }

        // Hide any large showcase sections on the homepage to focus on search results
        const featuredSection = document.querySelector('section.bg-white.dark:bg-gray-900')
        if (featuredSection) featuredSection.style.display = 'none'
        
        const aboutSection = document.querySelector('section.py-8.bg-gray-50')
        if (aboutSection) aboutSection.style.display = 'none'

        // Hide pagination controls (since results will be listed together)
        const pagination = document.querySelector('nav[aria-label="Page navigation"]')
        if (pagination) pagination.style.display = 'none'

        // Set up grid spinner
        const grid = latestDiv.querySelector('.grid')
        if (grid) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-24">
                    <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
                    <p class="text-gray-500 dark:text-gray-400">Searching archive articles...</p>
                </div>
            `
        }

        try {
            // Fetch generated static search index
            const response = await fetch('/modern-journal.github.io/search_index.json')
            if (!response.ok) throw new Error("Search index file not accessible")
            
            const posts = await response.json()
            const lowercaseQuery = query.toLowerCase()
            
            // Search algorithm filtering
            const results = posts.filter(post => {
                return post.title.toLowerCase().includes(lowercaseQuery) ||
                       post.excerpt.toLowerCase().includes(lowercaseQuery) ||
                       post.content.toLowerCase().includes(lowercaseQuery) ||
                       post.author.toLowerCase().includes(lowercaseQuery) ||
                       post.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)) ||
                       post.category.toLowerCase().includes(lowercaseQuery)
            })

            // Update search result heading count
            const countText = document.getElementById('search-count')
            if (countText) {
                countText.innerHTML = `Found ${results.length} result${results.length === 1 ? '' : 's'} for "${escapeHtml(query)}"`
            }

            if (results.length === 0) {
                grid.innerHTML = `
                    <div class="col-span-full text-center py-24">
                        <i class="bi bi-search text-6xl text-gray-300 dark:text-gray-600 mb-6 block"></i>
                        <h3 class="text-2xl font-bold dark:text-white">No results found</h3>
                        <p class="text-gray-500 dark:text-gray-400 mt-2">We couldn't find any posts matching "${escapeHtml(query)}".</p>
                        <a href="/modern-journal.github.io/" class="inline-flex items-center mt-6 px-6 py-3 text-base font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg">View All Posts</a>
                    </div>
                `
            } else {
                grid.innerHTML = results.map(post => `
                    <article class="flex flex-col bg-white rounded-lg border border-gray-200 shadow-md dark:bg-gray-800 dark:border-gray-700">
                        <div class="p-6 flex-grow">
                            <div class="flex justify-between items-center mb-5 text-gray-500">
                                ${post.category && post.category !== 'Uncategorized' ? `
                                    <span class="bg-primary-100 text-primary-800 text-xs font-medium inline-flex items-center px-2.5 py-0.5 rounded dark:bg-primary-200 dark:text-primary-800">
                                        <i class="bi bi-folder2-open mr-1"></i>
                                        ${escapeHtml(post.category)}
                                    </span>
                                ` : '<span></span>'}
                                <span class="text-sm">${escapeHtml(post.created_at)}</span>
                            </div>
                            <h2 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                <a href="/modern-journal.github.io/post/${escapeHtml(post.slug)}/">${escapeHtml(post.title)}</a>
                            </h2>
                            <p class="mb-5 font-light text-gray-500 dark:text-gray-400 text-sm">
                                ${escapeHtml(truncateWords(post.excerpt || post.content, 20))}
                            </p>
                            <div class="flex flex-wrap gap-2 mb-4">
                                ${post.tags.map(tag => `
                                    <span class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded text-primary-600 bg-primary-100 uppercase last:mr-0 mr-1">
                                        #${escapeHtml(tag)}
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                        <div class="px-6 py-4 flex justify-between items-center border-t border-gray-200 dark:border-gray-700">
                            <div class="flex items-center space-x-4">
                                <div class="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-xs">
                                    ${escapeHtml(post.author.charAt(0).toUpperCase())}
                                </div>
                                <span class="font-medium dark:text-white text-sm">
                                    ${escapeHtml(post.author)}
                                </span>
                            </div>
                            <a href="/modern-journal.github.io/post/${escapeHtml(post.slug)}/" class="inline-flex items-center font-medium text-primary-600 dark:text-primary-500 hover:underline text-sm">
                                Read more
                                <i class="bi bi-arrow-right ml-2"></i>
                            </a>
                        </div>
                    </article>
                `).join('')
            }

        } catch (error) {
            console.error("Search engine retrieval failed:", error)
            grid.innerHTML = `
                <div class="col-span-full text-center py-24 text-red-600 dark:text-red-400">
                    <i class="bi bi-exclamation-triangle text-6xl mb-4 block"></i>
                    <p>Failed to retrieve the search index. The static archive may be loading.</p>
                </div>
            `
        }
    }

    // --- Setup Listeners ---
    window.addEventListener('DOMContentLoaded', () => {
        // Theme toggle action listener
        const toggle = document.querySelector('.btn-theme-toggle')
        if (toggle) {
            toggle.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-bs-theme')
                const theme = currentTheme === 'dark' ? 'light' : 'dark'
                setStoredTheme(theme)
                setTheme(theme)
            })
        }

        // 1. Hook search query from URL parameters
        const urlParams = new URLSearchParams(window.location.search)
        const searchQuery = urlParams.get('q')
        
        if (searchQuery && searchQuery.trim() !== '') {
            const query = searchQuery.trim()
            // Set value in navbar search inputs
            const searchInputs = document.querySelectorAll('input[name="q"]')
            searchInputs.forEach(input => {
                input.value = query
            })
            performClientSideSearch(query)
        }

        // Determine if running as a static archive on GitHub Pages
        const isStaticArchive = window.location.hostname.includes('github.io') || window.location.hostname.includes('static');

        // 2. Intercept and block dynamic user account and editing links (only in static archive mode)
        document.body.addEventListener('click', (e) => {
            if (!isStaticArchive) return;

            const link = e.target.closest('a')
            if (!link) return
            
            const href = link.getAttribute('href')
            if (!href) return
            
            const isDynamic = href.includes('/accounts/') || 
                              href.includes('/auth/') || 
                              href.includes('/admin/') || 
                              href.includes('/post/new/') || 
                              href.endsWith('/edit/') || 
                              href.endsWith('/delete/') || 
                              href.endsWith('/like/')
                              
            if (isDynamic) {
                e.preventDefault()
                showArchiveModal(
                    "Feature Unavailable",
                    "The Modern Journal is hosted as a high-performance static archive on GitHub Pages. Dynamic features such as user accounts, dashboards, writing posts, liking, or editing are disabled in this read-only version."
                )
            }
        })

        // 3. Intercept and block dynamic POST form submissions (only in static archive mode)
        document.body.addEventListener('submit', (e) => {
            if (!isStaticArchive) return;

            const form = e.target
            const method = form.getAttribute('method') || 'GET'
            
            if (method.toUpperCase() === 'POST') {
                e.preventDefault()
                showArchiveModal(
                    "Action Disabled",
                    "This website is hosted as a static archive on GitHub Pages. Submitting comments or contact forms is disabled in this read-only version.<br><br>To contact the author, please email directly at <a href='mailto:obaidbelmaaris@gmail.com' class='text-primary-600 dark:text-primary-400 hover:underline font-semibold'>obaidbelmaaris@gmail.com</a> or call <strong class='text-gray-900 dark:text-white'>+212 72 531 1205</strong>."
                )
            }
        })
    })
})()