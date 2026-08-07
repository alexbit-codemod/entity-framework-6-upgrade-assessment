using System.Data.Entity;

namespace Sample
{
    public class Boot
    {
        static Boot()
        {
            Database.SetInitializer<OrderContext>(new DropCreateDatabaseAlways<OrderContext>());
        }
    }

    public class OrderContext : DbContext { }
}
