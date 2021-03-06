var momentLocaleDep = new Tracker.Dependency();

Meteor.startup(function() {

  var locale = Meteor.settings.public.blog.defaultLocale;
  Session.set('locale', locale);

  Tracker.autorun(function() {
    var locale = Session.get('locale');
    TAPi18n.setLanguage(locale)
      .fail(function (error_message) {
        console.log('ERROR setting language: ' + error_message);
      })
      .done(function() {
        var momentConfig = $.parseJSON(TAPi18n.__("moment"));
        moment.locale(locale, momentConfig);
        momentLocaleDep.changed();
      });
  });
});

// ***********************************************************************************************
// **** Blog List

Template.blogList.rendered = function () {
  Tracker.autorun(function() {
    Session.get('locale'); // force dependency
  });
};

var _setMetadata = function (meta) {
  if (meta.title) {
    document.title = meta.title;
    delete meta.title;
  }
  for (var key in meta) {
    $('meta[name="' + key + '"]').remove();
    $('head').append('<meta name="' + key + '" content="' + meta[key] + '">');

    $('meta[property="og:' + key + '"]').remove();
    $('head').append('<meta property="og:' + key + '" content="' + meta[key] + '">');
  }
};

Template.blogList.onCreated = function () {
  var self = this;
  self.serverBlogCount = new ReactiveVar(false);
  this.autorun(function () {
    Meteor.call('mdBlogCount', function (err, serverBlogCount) {
      self.serverBlogCount.set(serverBlogCount);
    });
  });
};

Template.blogList.helpers({
  content: function () {
    return marked(this.summary);
  },
  blog_item: function(){
    var route=FlowRouter.reactiveCurrent().route.path;
    if (route===getBaseArchivePath()){
      return Blog.find({archived: true}, {sort: {date: -1}});
    }
    else{
      return Blog.find({archived: false}, {sort: {date: -1}});
    }


  }
});

Template.blogList.events({
  'click #mdblog-new': _new
});

function _new () {
  if (!Meteor.user()) {
    this.render('not-found');
    return;
  }

  var author = Meteor.user().profile && Meteor.user().profile.name ? Meteor.user().profile.name : Meteor.user().emails[0].address;
  var newBlog = {
    title: 'Click to edit this title',
    date: new Date(),
    author: author,
    summary: 'Click to edit this summary. Write a paragraph (100 word) summary for best aesthetics',
    content: 'This is where the content of the blog goes. You can edit it using markdown. Also recommend you add a blog picture (which assigns an image to the blog). Use unsplash images (widescreen) ideally.'
  };
  Meteor.call('upsertBlog', newBlog, function(err, blog) {
    if (!err) {
      FlowRouter.go('/blog/'+blog.shortId+'/'+blog.slug);
    } else {
      console.log('Error upserting blog', err);
    }

  });

}

function _getRandomSummary () {
  var subjects = ['I', 'You', 'She', 'He', 'They', 'We'];
  var verbs = ['was just', 'will get', 'found', 'attained', 'received', 'will merge with', 'accept', 'accepted'];
  var objects = ['Billy', 'an apple', 'a force', 'the treasure', 'a sheet of paper'];
  var endings = ['.', ', right?', '.', ', like I said I would.', '.', ', just like your app!'];

  return subjects[Math.round(Math.random() * (
    subjects.length - 1))] + ' ' +
    verbs[Math.round(Math.random() * (verbs.length - 1))] + ' ' +
    objects[Math.round(Math.random() * (objects.length - 1))] +
    endings[Math.round(Math.random() * (endings.length - 1))];
}

// ***********************************************************************************************
// **** Blog Post


Template.blogPost.events({
  'click [contenteditable], focus *[contenteditable]': _edit,
  'keyup [contenteditable]': _update,
  'blur [contenteditable]': _stopEditing,
  'dropped #content': _droppedPicture,
  'click #mdblog-picture': _choosePicture,
  'change #mdblog-file-input': _inputPicture,
  'click #mdblog-picture-2': _choosePicture2,
  'change #mdblog-file-input-2': _inputPicture2
});

Template.blogPost.helpers({
  blogPostReady: function () {
    var slug=FlowRouter.reactiveCurrent().params.slug;
    var blog=Blog.findOne({slug: slug});
    if(blog!==undefined && blog!==null){
      return true;
    }
    else{
      return false;
    }
  },
  blog_post : function (){
    var slug=FlowRouter.reactiveCurrent().params.slug;
    var blog=Blog.findOne({slug: slug});
    if(blog){
      _setMetadata({
        title: blog.title,
        description: blog.summary
      });
    }
    return blog;
  },
  content: function () {
    //content=
    var $content = $('<p/>', {html: marked(this.content)});
    _prettify($content);
    return $content.html();
  },
  contenteditable: function () {
    if (UI._globalHelpers.isInRole('mdblog-author')) {
      return 'contenteditable';
    }
    return '';
  },
  allowPictureUpload: function () {
    return UI._globalHelpers.isInRole('mdblog-author') && _allowPictureUpload();
  }
});

function _update (ev) {
  if (ev.keyCode == 27) {
    $(element).blur();
    return;
  }
  var element = ev.currentTarget;
  __update(this, element);
}

__update = function (blogPost, element) {
  Session.set('mdblog-modified', true);
  $('#mdblog-publish').show();
  blogPost[element.id] = element.innerText;
  if ($(element).data('markdown')) {
    var $content = $('<p/>', {html: marked(element.innerText)});
    _prettify($content);
    $('#mdblog-clone')[0].innerHTML = $content.html();
  }
};

function _edit (ev) {
  var $el = $(ev.currentTarget);
  if ($el.data('editing')) {
    return;
  }
  if ($el.data('markdown')) {
    var clone = $el.clone();
    $el.after(clone.attr('id', 'mdblog-clone'));
  }
  $el.addClass('editing');
  $el.data('editing', true);
  ev.currentTarget.innerText = this[ev.currentTarget.id];
}

function _stopEditing (ev) {
  var element = ev.currentTarget;
  var $el = $(element);
  $el.data('editing', false);
  $el.removeClass('editing');

  this[element.id] = element.innerText;
  if ($el.data('markdown')) {
    $('#mdblog-clone').remove();
    var $content = $('<p/>', {html: marked(element.innerText)});
    _prettify($content);
    element.innerHTML = $content.html();
  }
  // TODO save changes to this.draft.history.time.[field]
}

function _addSyntaxHighlighting (e) {
  var syntaxHighlighting = Meteor.settings.public.blog.prettify['syntax-highlighting'];
  if (syntaxHighlighting) {
    e.find('pre').each(function (i, block) {
      hljs.highlightBlock(block);
    });
  }
}

function _addClassesToElements (e) {
  var elementClasses = Meteor.settings.public.blog.prettify['element-classes'];
  if (elementClasses) {
    var addClass = function (idx, element) {
      var $elem = $(element);
      $elem.addClass(elementClasses[i].classes.join(' '));
    };
    for (var i = 0; i < elementClasses.length; i++) {
      e.find(elementClasses[i].locator).each(addClass);
    }
  }
}

function _prettify (content) {
  if (Meteor.settings.public.blog.prettify) {
    _addSyntaxHighlighting(content);
    _addClassesToElements(content);
  }
}

// **** File Upload

function _droppedPicture(event, template) {
  if (_allowPictureUpload()) {
    _insertPictures (template.data, event.originalEvent.dataTransfer.files);
  }
}

function _choosePicture () {
  $('#mdblog-file-input').click();
}

function _choosePicture2 () {
  $('#mdblog-file-input-2').click();
}
function _inputPicture (event, template) {
  _insertPictures (template.data, event.target.files);
}

function _inputPicture2 (event, template) {
  var slug=FlowRouter.reactiveCurrent().params.slug;
  _insertPictures2 (Blog.findOne({slug:slug})._id, event.target.files[0]);
}


// ***********************************************************************************************
// **** Blog Controls


Template.blogControls.helpers({
  modified: function () {
    return Session.get('mdblog-modified');
  }
});

Template.blogControls.events({
  'click #mdblog-save': _save,
  'click #mdblog-publish': _publish,
  'click #mdblog-unpublish': _unpublish,
  'click #mdblog-archive': _archive,
  'click #mdblog-unarchive': _unarchive,
  'click #mdblog-delete': _delete
});

function _save () {
  if (this.published) {
    var userIsSure = confirm(TAPi18n.__("confirm_save_published"));
    if (!userIsSure) {
      return;
    }
  }
  Meteor.call('upsertBlog', this, function (err, blog) {
    if (!err) {
      FlowRouter.go('/blog/'+blog.shortId+'/'+blog.slug);
      Session.set('mdblog-modified', false);
    }
  });
}

function _publish () {
  var userIsSure = confirm(TAPi18n.__("confirm_publish"));
  if (userIsSure) {
    this.published = true;
    Meteor.call('upsertBlog', this);
    if (Meteor.settings.public.blog.emailOnPublish) {
      Meteor.call('sendEmail', this);
    }
  }
}

function _unpublish () {
  var userIsSure = confirm(TAPi18n.__("confirm_unpublish"));
  if (userIsSure) {
    this.published = false;
    Meteor.call('upsertBlog', this);
  }
}

function _archive () {
  var userIsSure = confirm(TAPi18n.__("confirm_archive"));
  if (userIsSure) {
    this.archived = true;
    Meteor.call('upsertBlog', this);
  }
}

function _unarchive () {
  var userIsSure = confirm(TAPi18n.__("confirm_unarchive"));
  if (userIsSure) {
    this.archived = false;
    Meteor.call('upsertBlog', this);
  }
}

function _delete () {
  var input = prompt(TAPi18n.__("confirm_delete"));
  if (input === TAPi18n.__("confirm_delete_YES")) {
    Meteor.call('deleteBlog', this, function (e) {
      if (!e) {
        FlowRouter.go('/blog');
      }
    });
  }
}


UI.registerHelper('mdBlogDate', function (date) {
  momentLocaleDep.depend();
  return moment(date).calendar();
});

UI.registerHelper('mdBlogElementClasses', function (type) {
  var elementClasses = Meteor.settings.public.blog.prettify['element-classes'];
  if (elementClasses) {
    for (var i = 0; i < elementClasses.length; i++) {
      if (elementClasses[i].locator === type) {
        return elementClasses[i].classes.join(' ');
      }
    }
  }

});
