using System.Data.Entity;

namespace Sample
{
    public class Boot
    {
        public void Configure(DbContext context)
        {
            context.Database.Initialize(true);
            Other.SetInitializer();
        }
    }

    public static class Other
    {
        public static void SetInitializer() { }
    }
}
