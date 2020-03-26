$(async function() {
  // cache some selectors we'll be using quite a bit
  const $body = $("body");
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $navWelcome = $("#nav-welcome");
  const $navUserProfile = $("#nav-user-profile");
  const $userProfile = $("#user-profile");
  const $navSubmit = $("#nav-submit");
  const $favoritedStories = $("#favorited-articles");
  

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);

    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);

    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function() {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Submit handler for article 
   */

  $submitForm.on("submit", async function(evt){
    evt.preventDefault();

    //get info from form
    const title = $('#title').val();
    const author = $("#author").val();
    const url = $("#url").val();
    const hostName = getHostName(url);
    const username = currentUser.username;

    const newStory = await storyList.addStory(currentUser, {
      author, title, url, username//, hostName
    })

    const storyLi = $(`
    <li id="${newStory.storyId}">
      <span class="star">
        <i class="far fa-star"></i>
      </span>
      <a class="article-link" href="${newStory.url}" target="a_blank">
        <strong>${newStory.title}</strong>
      </a>
      <small class="article-author">by ${newStory.author}</small>
      <small class="article-hostname ${newStory.hostName}">(${hostName})</small>
      <small class="article-username">posted by ${newStory.username}</small>
    </li>
  `);

    $allStoriesList.prepend(storyLi);

    $submitForm.slideUp("slow");
    $submitForm.trigger("reset");
  })
  
  
  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function() {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

   /**
   * Event handler for when you're looking at your profile
   */

   $navUserProfile.on("click", function(){
     //hide everything
     hideElements();
     //show the user profile
     $userProfile.show();
   })

  /**
   * Event handler for Navigation Submit
   */

   $navSubmit.on("click", function() {
     if (currentUser) {
       hideElements();
       $allStoriesList.show();
       $submitForm.slideToggle();
     }
   })

   /**
   * Event handler for navigating to Favorites
   */
  $body.on("click", "#nav-favorites", function() {
    hideElements();
    if(currentUser) {
      generateFaves();
      $favoritedStories.show();
    }
  })

  /**
   * Event handler for Navigation to Homepage
   */

  $body.on("click", "#nav-all", async function() {
    hideElements();
    await generateStories();
    $allStoriesList.show();
  });

  /**
   * Event handler for Favoriting
   */

   $('.articles-container').on("click", ".star", async function(evt){
    
    let storyId = $(evt.target).closest("li").attr('id');
    
    if($(evt.target).hasClass('far')) {
      await currentUser.addFavorite(storyId);
      $(evt.target).removeClass('far').addClass('fas')
    } else {
      await currentUser.removeFavorite(storyId);
      $(evt.target).removeClass('fas').addClass('far')
    }
   })

   /**
   * Event handler for My Stories
   */
   $body.on("click", "#nav-my-stories", function () {
     hideElements();
     if (currentUser) {
       $userProfile.hide();
       generateMyStories();
       $ownStories.show();
     }
   })

   /**
   * Event handler for Deleting one of My Stories
   */

   $ownStories.on("click", ".trash-can", async function (evt) {
   
      let storyId = $(evt.target).closest("li").attr('id');
      
      await storyList.removeStory(currentUser, storyId);
      await generateStories();
      hideElements();
      $allStoriesList.show();
   })

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      generateProfile();
      showNavForLoggedInUser();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();

    //get a user profile
    generateProfile();
  }

   /**
   * Build a user profile based on the global "user" instance
   */

   function generateProfile() {
     //show name
     $('#profile-name').text(`Name: ${currentUser.name}`);
     //show username
     $("#profile-username").text(`Username: ${currentUser.username}`);
     $("#profile-account-date").text(`Account Created: ${currentUser.createdAt.slice(0, 10)}`);
     //set navigation to list the username
     $navUserProfile.text(`${currentUser.username}`)
   }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
  }

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story, isOwnStory) {
    let hostName = getHostName(story.url);
    let starType = isFavorite(story) ? "fas" : "far";

    //show the trash can icon to delete your own stories
    const trashCanIcon = isOwnStory ? `<span class="trash-can">
          <i class="fas fa-trash-alt"></i>
        </span>`
      : "";
      
      
    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
      ${trashCanIcon}
        <span class="star">
          <i class="${starType} fa-star"></i>
        </span>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

  /* Render the favorites list */

  function generateFaves() {
    $favoritedStories.empty();

    // if the user doesn't have favorites:
    if (currentUser.favorites.length === 0) {
      $favoritedStories.append("<h6>Please add some favorites!</h6>");
    } else {
      for (let story of currentUser.favorites) {
        let favoriteHTML = generateStoryHTML(story, false, true);
        $favoritedStories.append(favoriteHTML);
      }
    }
  } 
  
  function generateMyStories() {
    $ownStories.empty();
  
    if (currentUser.ownStories.length === 0){
      $ownStories.append("<h6>No stories added by current user yet!</h6>")
    } else {
      for (let story of currentUser.ownStories) {
        let ownStoryHTML = generateStoryHTML(story, true);
        $ownStories.append(ownStoryHTML)
      }
    }

    $ownStories.show();
  }

  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm,
      $userProfile,
      $favoritedStories
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

/* check if a story is in the user's favorite list */

  function isFavorite(story) {
    let favStoryIds = new Set();
    if (currentUser) {
      favStoryIds = new Set(currentUser.favorites.map(obj => obj.storyId));
    }
    return favStoryIds.has(story.storyId)
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $userProfile.hide();
    $(".main-nav-links, #user-profile").toggleClass("hidden");
    $navWelcome.show();
    $navLogOut.show();
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});
