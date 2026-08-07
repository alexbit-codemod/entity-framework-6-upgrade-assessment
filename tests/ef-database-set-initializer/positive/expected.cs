using System.Data.Entity;

namespace Sample
{
    public class Boot
    {
        public void Configure()
        {
            Database.SetInitializer<MyContext>(null);
            Database.SetInitializer(new CreateDatabaseIfNotExists<MyContext>());
        }
    }

    public class MyContext : DbContext { }
}
