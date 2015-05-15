FlowRouter.route(getBaseBlogPath(), {
  middlewares: [],
  subscriptions: function(params) {
    this.register('blog', Meteor.subscribe('blog'));
  },
  action: function(params) {
    Session.set('mdblog-modified', false);
    return FlowLayout.render('blogListLayout', {
      main: 'blogList'
    });
  }
});

FlowRouter.route(getBaseArchivePath(), {
  middlewares: [],
  subscriptions: function(params) {
    this.register('blog_archive', Meteor.subscribe('blog'));
  },
  action: function(params) {
    Session.set('mdblog-modified', false);
    return FlowLayout.render('blogListLayout', {
      main: 'blogList'
    });
  }
});

FlowRouter.route(getBaseBlogPath()+'/:shortId/:slug', {
  middlewares: [],
  subscriptions: function(params) {
    this.register('blog', Meteor.subscribe('blog'));
  },
  action: function(params) {
    Session.set('mdblog-modified', false);
    return FlowLayout.render('blogPostLayout', {
      main: 'blogPost'
    });
  }
});
//
//(function () {
//
//  'use strict';
//
//  MeteorSettings.setDefaults({ public: { blog: {} }});
//
//  var blogSub = Meteor.subscribe('blog');
//
//  Router.map(function () {
//    this.route('blogList', {
//      path: getBaseBlogPath(),
//      layoutTemplate: 'blogListLayout',
//      action: function () {
//        this.wait(blogSub);
//        this.render('blogList');
//      },
//      data: function () {
//        var sort = Meteor.settings.public.blog.sortBy;
//        return Blog.find({archived: false}, {sort: sort ? sort : {date: -1}});
//      }
//    });
//
//    this.route('blogListArchive', {
//      path: getBaseArchivePath(),
//      layoutTemplate: 'blogListLayout',
//      action: function () {
//        this.wait(blogSub);
//        this.render('blogList');
//      },
//      data: function () {
//        var sort = Meteor.settings.public.blog.sortBy;
//        return Blog.find({archived: true}, {sort: {date: -1}});
//      }
//    });
//
//    this.route('blogPost', {
//      path: getBlogPostPath(':shortId', ':slug'),
//      layoutTemplate: 'blogPostLayout',
//      action: function () {
//        this.wait(blogSub);
//        this.render('blogPost');
//      },
//      data: function () {
//        if (this.ready()) {
//          var blog = Blog.findOne({slug: this.params.slug});
//          if (blog) {
//            blog.loaded = true;
//            return blog;
//          }
//          this.render('not-found')
//        }
//      }
//    });
//
//  });
//})();
